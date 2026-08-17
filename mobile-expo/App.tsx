import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ChoicePill, SelectModal } from './src/components';
import { clearSession, generateDraft, getSession, listProducts, loadCatalog, login, publishDraft, saveSession } from './src/api';
import type { AuthUser, Catalog, CatalogItem, ClothingForm, DraftImage, ListedProduct } from './src/types';

const emptyCatalog: Catalog = { categories: [], subcategories: [], patterns: [], sizes: [] };
const blankForm = (): ClothingForm => ({ name: '', categoryName: '', subcategoryName: null, patternName: '', description: '', confidence: 0, notes: [], sizeId: '', price: '', stock: '1', initialLocation: 'ARMAZEM' });
type Selection = 'category' | 'subcategory' | 'pattern' | 'size' | null;
type Screen = 'list' | 'create';

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'decimal-pad' | 'numeric'; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#a593a1" keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && styles.multiline]} /></View>;
}

function PrimaryButton({ title, onPress, loading = false, disabled = false }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return <Pressable style={[styles.primaryButton, (disabled || loading) && styles.disabled]} disabled={disabled || loading} onPress={onPress}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{title}</Text>}</Pressable>;
}

function AppContent() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [products, setProducts] = useState<ListedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productPages, setProductPages] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [screen, setScreen] = useState<Screen>('list');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [draftImages, setDraftImages] = useState<DraftImage[]>([]);
  const [form, setForm] = useState<ClothingForm>(blankForm());
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [success, setSuccess] = useState<{ barcode: string; merged: boolean } | null>(null);

  useEffect(() => { (async () => {
    const session = await getSession();
    if (session) { setToken(session.token); setUser(session.user); try { const [nextCatalog, nextProducts] = await Promise.all([loadCatalog(session.token), listProducts(session.token)]); setCatalog(nextCatalog); setProducts(nextProducts.data); setProductPage(nextProducts.pagination.page); setProductPages(nextProducts.pagination.pages); setProductTotal(nextProducts.pagination.total); } catch { Alert.alert('Conexão', 'Não foi possível atualizar os cadastros agora. Tente novamente em instantes.'); } }
    setReady(true);
  })(); }, []);

  const subcategories = useMemo(() => form.categoryId ? catalog.subcategories.filter((item) => item.categoryId === form.categoryId) : [], [catalog.subcategories, form.categoryId]);
  const selectedSize = catalog.sizes.find((item) => item.id === form.sizeId);

  async function refreshProducts(currentToken = token, page = 1, query = search, append = false) {
    if (!currentToken) return;
    setLoadingProducts(true);
    try {
      const response = await listProducts(currentToken, { page, search: query });
      setProducts((items) => append ? [...items, ...response.data] : response.data);
      setProductPage(response.pagination.page); setProductPages(response.pagination.pages); setProductTotal(response.pagination.total);
    }
    catch (error) { Alert.alert('Não foi possível carregar as roupas', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setLoadingProducts(false); }
  }

  async function handleLogin() {
    if (!email.trim() || !password) return Alert.alert('Informe seus dados', 'Digite o e-mail e a senha para entrar.');
    setLoggingIn(true);
    try {
      const session = await login(email, password);
      await saveSession(session); setToken(session.token); setUser(session.user);
      const [nextCatalog, nextProducts] = await Promise.all([loadCatalog(session.token), listProducts(session.token)]);
      setCatalog(nextCatalog); setProducts(nextProducts.data); setProductPage(nextProducts.pagination.page); setProductPages(nextProducts.pagination.pages); setProductTotal(nextProducts.pagination.total); setScreen('list');
    } catch (error) { Alert.alert('Não foi possível entrar', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setLoggingIn(false); }
  }

  async function choosePhoto(source: 'camera' | 'library') {
    if (photos.length >= 2) return Alert.alert('Limite de fotos', 'Use no máximo duas fotos por roupa.');
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para cadastrar a roupa.');
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: false });
    if (!result.canceled) setPhotos((current) => [...current, result.assets[0].uri].slice(0, 2));
  }

  async function createDraft() {
    if (!token || !photos.length) return;
    setGenerating(true);
    try {
      const response = await generateDraft(token, photos);
      setDraftImages(response.images);
      setForm({ ...response.draft, subcategoryName: response.draft.subcategoryName || null, sizeId: '', price: '', stock: '1', initialLocation: 'ARMAZEM' });
      setSuccess(null);
      try { setCatalog(await loadCatalog(token)); } catch { /* cadastro ainda pode ser concluído com o catálogo já carregado */ }
    } catch (error) { Alert.alert('Rascunho não gerado', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setGenerating(false); }
  }

  function resetDraft() { setPhotos([]); setDraftImages([]); setForm(blankForm()); setSuccess(null); }

  async function handlePublish() {
    if (!token) return;
    if (!form.sizeId) return Alert.alert('Tamanho obrigatório', 'Selecione o tamanho da peça antes de publicar.');
    if (!form.name.trim() || !form.categoryName.trim() || !form.patternName.trim() || !form.price || !form.stock) return Alert.alert('Revise o cadastro', 'Nome, categoria, estampa, preço e estoque são obrigatórios.');
    setPublishing(true);
    try {
      const result = await publishDraft(token, form, draftImages);
      setSuccess({ barcode: result.product.barcode, merged: result.mergedIntoExisting });
      setCatalog(await loadCatalog(token));
      await refreshProducts(token);
    } catch (error) { Alert.alert('Não foi possível publicar', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setPublishing(false); }
  }

  function selectItem(item: CatalogItem) {
    if (selection === 'category') setForm((value) => ({ ...value, categoryId: item.id, categoryName: item.name, subcategoryId: undefined, subcategoryName: null }));
    if (selection === 'subcategory') setForm((value) => ({ ...value, subcategoryId: item.id, subcategoryName: item.name }));
    if (selection === 'pattern') setForm((value) => ({ ...value, patternId: item.id, patternName: item.name }));
    if (selection === 'size') setForm((value) => ({ ...value, sizeId: item.id }));
    setSelection(null);
  }

  const selectionOptions = selection === 'category' ? catalog.categories : selection === 'subcategory' ? subcategories : selection === 'pattern' ? catalog.patterns : catalog.sizes;
  const selectionTitle = selection === 'category' ? 'Escolha a categoria' : selection === 'subcategory' ? 'Escolha a subcategoria' : selection === 'pattern' ? 'Escolha a estampa' : 'Escolha o tamanho';

  if (!ready) return <View style={styles.loadingScreen}><ActivityIndicator size="large" color="#7c174f" /></View>;
  if (!token || !user) return <SafeAreaView style={styles.screen}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginWrap}><View style={styles.brand}><Text style={styles.brandMark}>A</Text><Text style={styles.brandName}>AMORAS</Text><Text style={styles.brandSub}>PRODUÇÃO</Text></View><Text style={styles.loginTitle}>Cadastro de roupas</Text><Text style={styles.loginText}>Entre com o mesmo acesso do sistema Amoras.</Text><Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@amoras.com" keyboardType="default" /><Field label="Senha" value={password} onChangeText={setPassword} placeholder="••••••••" /><PrimaryButton title="Entrar" onPress={handleLogin} loading={loggingIn} /></KeyboardAvoidingView></SafeAreaView>;

  return <SafeAreaView style={styles.screen}><View style={styles.topbar}><Pressable onPress={() => setScreen('list')}><Text style={styles.topbarBrand}>AMORAS</Text><Text style={styles.topbarTitle}>Produção</Text></Pressable><Pressable onPress={async () => { await clearSession(); setToken(null); setUser(null); setProducts([]); resetDraft(); }}><Text style={styles.exit}>Sair</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {screen === 'list' ? <>
        <View style={styles.listHead}><View><Text style={styles.welcome}>Olá, {user.name.split(' ')[0]}.</Text><Text style={styles.heading}>Roupas</Text><Text style={styles.listCount}>{productTotal} {productTotal === 1 ? 'roupa cadastrada' : 'roupas cadastradas'}</Text></View><Pressable style={styles.refresh} onPress={() => refreshProducts()} disabled={loadingProducts}><Text style={styles.refreshText}>{loadingProducts ? '...' : 'Atualizar'}</Text></Pressable></View>
        <PrimaryButton title="+ Cadastrar roupa" onPress={() => { resetDraft(); setScreen('create'); }} />
        <View style={styles.searchRow}><TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => refreshProducts(token, 1, search)} placeholder="Buscar nome, código ou estampa" placeholderTextColor="#a593a1" style={styles.searchInput} returnKeyType="search" /><Pressable style={styles.searchAction} onPress={() => refreshProducts(token, 1, search)}><Text style={styles.searchActionText}>Buscar</Text></Pressable></View>
        {loadingProducts && !products.length ? <ActivityIndicator color="#7c174f" style={styles.listLoader} /> : products.length ? <View style={styles.productList}>{products.map((product) => <View key={product.id} style={styles.productCard}><View style={styles.productTop}><Text style={styles.productName}>{product.name || 'Roupa sem nome'}</Text><Text style={styles.productStock}>{product.stock} un.</Text></View><Text style={styles.productMeta}>{[product.category?.name, product.subcategory?.name, product.pattern?.name, product.size?.name].filter(Boolean).join(' • ') || 'Sem classificação'}</Text><View style={styles.productBottom}><Text style={styles.productPrice}>{typeof product.price === 'number' ? product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Preço não informado'}</Text><Text style={styles.productCode}>{product.barcode || 'Sem código'}</Text></View></View>)}{productPage < productPages && <Pressable style={styles.moreButton} onPress={() => refreshProducts(token, productPage + 1, search, true)} disabled={loadingProducts}><Text style={styles.moreButtonText}>{loadingProducts ? 'Carregando…' : 'Carregar mais roupas'}</Text></Pressable>}</View> : <View style={styles.empty}><Text style={styles.emptyTitle}>{search ? 'Nenhuma roupa encontrada' : 'Ainda não há roupas cadastradas'}</Text><Text style={styles.emptyText}>{search ? 'Tente outro termo de busca.' : 'Toque em “Cadastrar roupa” para criar a primeira peça com ajuda da IA.'}</Text></View>}
      </> : success ? <View style={styles.successCard}><Text style={styles.successTitle}>{success.merged ? 'Estoque atualizado' : 'Roupa publicada'}</Text><Text style={styles.successText}>{success.merged ? 'A peça já existia e as unidades foram adicionadas.' : 'O produto, suas fotos e o estoque já estão no sistema.'}</Text><Text style={styles.barcode}>Código: {success.barcode}</Text><PrimaryButton title="Voltar para roupas" onPress={() => { resetDraft(); setScreen('list'); }} /><Pressable style={styles.secondaryAction} onPress={resetDraft}><Text style={styles.secondaryActionText}>Cadastrar outra roupa</Text></Pressable></View> : !draftImages.length ? <>
        <Text style={styles.welcome}>Olá, {user.name.split(' ')[0]}.</Text><Text style={styles.heading}>Vamos cadastrar uma roupa</Text><Text style={styles.helper}>Fotografe a peça em boa luz. A IA prepara o rascunho e você confirma os dados.</Text>
        <View style={styles.photoGrid}>{[0, 1].map((slot) => photos[slot] ? <View key={slot} style={styles.photoWrap}><Image source={{ uri: photos[slot] }} style={styles.photo} /><Pressable style={styles.removePhoto} onPress={() => setPhotos((items) => items.filter((_, index) => index !== slot))}><Text style={styles.removeText}>×</Text></Pressable></View> : <Pressable key={slot} style={styles.photoEmpty} onPress={() => Alert.alert('Adicionar foto', 'Escolha como deseja incluir a foto.', [{ text: 'Câmera', onPress: () => choosePhoto('camera') }, { text: 'Galeria', onPress: () => choosePhoto('library') }, { text: 'Cancelar', style: 'cancel' }])}><Text style={styles.plus}>+</Text><Text style={styles.photoLabel}>{slot === 0 ? 'Foto principal' : 'Outra foto (opcional)'}</Text></Pressable>)}</View>
        <PrimaryButton title="Gerar rascunho com IA" onPress={createDraft} loading={generating} disabled={!photos.length} />
      </> : <>
        <View style={styles.reviewHead}><Text style={styles.heading}>Revise o rascunho</Text><Pressable onPress={resetDraft}><Text style={styles.redo}>Refazer fotos</Text></Pressable></View><Text style={styles.helper}>A IA sugere; a decisão final é sua. Os cadastros novos só são criados ao publicar.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs}>{photos.map((uri) => <Image key={uri} source={{ uri }} style={styles.thumb} />)}</ScrollView>
        <Field label="Nome da roupa" value={form.name} onChangeText={(name) => setForm((value) => ({ ...value, name }))} placeholder="Ex.: Vestido midi floral" />
        <Field label="Categoria" value={form.categoryName} onChangeText={(categoryName) => setForm((value) => ({ ...value, categoryName, categoryId: undefined, subcategoryName: null, subcategoryId: undefined }))} placeholder="Digite ou selecione abaixo" />
        <Pressable style={styles.selectButton} onPress={() => setSelection('category')}><Text style={styles.selectText}>Selecionar categoria existente</Text></Pressable>
        <Field label="Subcategoria (opcional)" value={form.subcategoryName || ''} onChangeText={(subcategoryName) => setForm((value) => ({ ...value, subcategoryName: subcategoryName || null, subcategoryId: undefined }))} placeholder="Digite ou selecione abaixo" />
        <Pressable style={[styles.selectButton, !form.categoryId && styles.disabled]} disabled={!form.categoryId} onPress={() => setSelection('subcategory')}><Text style={styles.selectText}>Selecionar subcategoria existente</Text></Pressable>
        <Field label="Estampa / identidade visual" value={form.patternName} onChangeText={(patternName) => setForm((value) => ({ ...value, patternName, patternId: undefined }))} placeholder="Ex.: Liso Preto Elegante" />
        <Pressable style={styles.selectButton} onPress={() => setSelection('pattern')}><Text style={styles.selectText}>Selecionar estampa existente</Text></Pressable>
        <Pressable style={styles.sizeButton} onPress={() => setSelection('size')}><Text style={styles.label}>Tamanho</Text><Text style={selectedSize ? styles.sizeValue : styles.sizePlaceholder}>{selectedSize ? selectedSize.name : 'Toque para selecionar'}</Text></Pressable>
        <View style={styles.row}><View style={styles.half}><Field label="Preço (R$)" value={form.price} onChangeText={(price) => setForm((value) => ({ ...value, price }))} placeholder="0,00" keyboardType="decimal-pad" /></View><View style={styles.half}><Field label="Quantidade" value={form.stock} onChangeText={(stock) => setForm((value) => ({ ...value, stock }))} placeholder="1" keyboardType="numeric" /></View></View>
        <Field label="Descrição" value={form.description} onChangeText={(description) => setForm((value) => ({ ...value, description }))} placeholder="Detalhes relevantes da peça" multiline />
        {form.notes.length > 0 && <View style={styles.note}><Text style={styles.noteTitle}>Observações da IA</Text>{form.notes.map((note) => <Text key={note} style={styles.noteText}>• {note}</Text>)}</View>}
        <Text style={styles.label}>Onde entra no estoque?</Text><View style={styles.pills}><ChoicePill label="Armazém" selected={form.initialLocation === 'ARMAZEM'} onPress={() => setForm((value) => ({ ...value, initialLocation: 'ARMAZEM' }))} /><ChoicePill label="Loja" selected={form.initialLocation === 'LOJA'} onPress={() => setForm((value) => ({ ...value, initialLocation: 'LOJA' }))} /></View>
        <PrimaryButton title="Publicar no sistema" onPress={handlePublish} loading={publishing} />
      </>}
    </ScrollView>
    <SelectModal visible={selection !== null} title={selectionTitle} options={selectionOptions} onSelect={selectItem} onClose={() => setSelection(null)} />
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fffaff' }, loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffaff' },
  loginWrap: { flex: 1, justifyContent: 'center', padding: 28 }, brand: { alignItems: 'center', marginBottom: 40 }, brandMark: { backgroundColor: '#7c174f', color: '#fff', width: 54, height: 54, textAlign: 'center', paddingTop: 10, borderRadius: 27, fontSize: 26, fontWeight: '800' }, brandName: { letterSpacing: 5, marginTop: 12, color: '#4b153a', fontWeight: '800', fontSize: 21 }, brandSub: { color: '#9b2c6b', letterSpacing: 3, marginTop: 3, fontWeight: '700', fontSize: 11 }, loginTitle: { fontSize: 27, fontWeight: '800', color: '#32142b' }, loginText: { color: '#765f70', marginTop: 8, marginBottom: 25, fontSize: 15, lineHeight: 21 },
  topbar: { height: 72, paddingHorizontal: 22, borderBottomWidth: 1, borderBottomColor: '#f1e6ed', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, topbarBrand: { color: '#7c174f', letterSpacing: 3, fontWeight: '800', fontSize: 14 }, topbarTitle: { color: '#634354', fontSize: 13 }, exit: { color: '#9b2c6b', fontWeight: '700' },
  content: { padding: 22, paddingBottom: 40 }, welcome: { color: '#7c174f', fontWeight: '700', marginTop: 8 }, heading: { color: '#32142b', fontSize: 26, fontWeight: '800', marginTop: 5 }, helper: { color: '#765f70', fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 23 }, photoGrid: { flexDirection: 'row', gap: 12, marginBottom: 22 }, photoEmpty: { flex: 1, height: 172, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#d9b8cb', backgroundColor: '#fff', borderRadius: 15, alignItems: 'center', justifyContent: 'center', padding: 12 }, plus: { fontSize: 30, color: '#9b2c6b', fontWeight: '300' }, photoLabel: { color: '#765f70', textAlign: 'center', marginTop: 8, fontSize: 13 }, photoWrap: { flex: 1, height: 172, position: 'relative' }, photo: { width: '100%', height: '100%', borderRadius: 15, backgroundColor: '#eadde5' }, removePhoto: { position: 'absolute', right: 8, top: 8, width: 27, height: 27, backgroundColor: '#4b153a', borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, removeText: { color: '#fff', fontSize: 22, lineHeight: 23 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }, listCount: { color: '#765f70', marginTop: 5 }, refresh: { paddingVertical: 10, paddingLeft: 14 }, refreshText: { color: '#9b2c6b', fontWeight: '800', fontSize: 13 }, searchRow: { flexDirection: 'row', gap: 8, marginTop: 16 }, searchInput: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: '#e1d3dc', borderRadius: 11, backgroundColor: '#fff', color: '#32142b', paddingHorizontal: 13 }, searchAction: { backgroundColor: '#f6e9f0', borderRadius: 11, justifyContent: 'center', paddingHorizontal: 14 }, searchActionText: { color: '#7c174f', fontWeight: '800', fontSize: 13 }, listLoader: { marginTop: 34 }, productList: { marginTop: 18, gap: 11 }, productCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eadde5', borderRadius: 14, padding: 15 }, productTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, productName: { color: '#32142b', fontSize: 16, fontWeight: '800', flex: 1 }, productStock: { color: '#7c174f', fontWeight: '800' }, productMeta: { color: '#765f70', marginTop: 8, lineHeight: 19 }, productBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 13, alignItems: 'flex-end' }, productPrice: { color: '#32142b', fontWeight: '800' }, productCode: { color: '#9a7b8d', fontSize: 11, flexShrink: 1, textAlign: 'right' }, moreButton: { borderWidth: 1, borderColor: '#d9b8cb', borderRadius: 11, paddingVertical: 14, alignItems: 'center', marginTop: 4 }, moreButtonText: { color: '#7c174f', fontWeight: '800' }, empty: { backgroundColor: '#fff1f8', borderRadius: 16, padding: 22, marginTop: 22 }, emptyTitle: { color: '#4b153a', fontSize: 17, fontWeight: '800' }, emptyText: { color: '#765f70', lineHeight: 21, marginTop: 7 }, secondaryAction: { alignItems: 'center', paddingVertical: 17 }, secondaryActionText: { color: '#9b2c6b', fontWeight: '800' },
  primaryButton: { minHeight: 52, backgroundColor: '#7c174f', borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 16 }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 }, disabled: { opacity: 0.45 }, field: { marginBottom: 14 }, label: { color: '#513347', fontWeight: '700', fontSize: 13, marginBottom: 7 }, input: { minHeight: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1d3dc', color: '#32142b', paddingHorizontal: 14, borderRadius: 11, fontSize: 16 }, multiline: { minHeight: 82, paddingTop: 12, textAlignVertical: 'top' },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, redo: { color: '#9b2c6b', fontWeight: '700', marginBottom: 3 }, thumbs: { marginBottom: 18 }, thumb: { width: 86, height: 86, borderRadius: 12, marginRight: 10, backgroundColor: '#e7dce4' }, selectButton: { alignSelf: 'flex-start', marginTop: -7, marginBottom: 16, paddingVertical: 7 }, selectText: { color: '#9b2c6b', fontWeight: '700', fontSize: 13 }, sizeButton: { borderWidth: 1, borderColor: '#e1d3dc', borderRadius: 11, padding: 13, marginBottom: 14, backgroundColor: '#fff' }, sizeValue: { color: '#32142b', fontSize: 16 }, sizePlaceholder: { color: '#a593a1', fontSize: 16 }, row: { flexDirection: 'row', gap: 12 }, half: { flex: 1 }, note: { backgroundColor: '#fff1f8', borderRadius: 12, padding: 13, marginBottom: 17 }, noteTitle: { color: '#7c174f', fontWeight: '800', marginBottom: 4 }, noteText: { color: '#674b60', lineHeight: 20 }, pills: { flexDirection: 'row', marginTop: 1, marginBottom: 10 },
  successCard: { marginTop: 45, backgroundColor: '#fff', borderRadius: 20, padding: 23, borderWidth: 1, borderColor: '#e7cedd' }, successTitle: { color: '#32142b', fontWeight: '800', fontSize: 26 }, successText: { color: '#765f70', lineHeight: 21, marginTop: 9 }, barcode: { color: '#7c174f', fontWeight: '800', marginTop: 18 },
});
