import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  BarChart3,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
  Tag,
  Sparkles,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Layers,
  CalendarDays,
  Percent,
  CircleDollarSign,
  PackageCheck,
  CalendarRange,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { salesApi } from '../services/api';
import { SalesReportData } from '../types';
import { getImageUrl, getProductCardImageUrl } from '../utils/imageUrl';

type PeriodMode = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface ReportThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

function ReportThumbnail({
  src,
  alt,
  className = 'w-14 h-14 sm:w-16 sm:h-16',
  fallbackIcon,
}: ReportThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useRawFallback, setUseRawFallback] = useState(false);

  const optimizedUrl = src ? getProductCardImageUrl(src) : '';
  const rawUrl = src ? getImageUrl(src) : '';
  const fullUrl = useRawFallback ? rawUrl : (optimizedUrl || rawUrl);

  if (!fullUrl || hasError) {
    return (
      <div
        className={`${className} rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100 shrink-0 select-none`}
      >
        {fallbackIcon || <Sparkles className="w-6 h-6 opacity-70" />}
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-lg bg-gray-100 border border-gray-200 overflow-hidden relative shrink-0 select-none shadow-xs`}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-gray-400 opacity-40" />
        </div>
      )}
      <img
        src={fullUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!useRawFallback && rawUrl && rawUrl !== optimizedUrl) {
            setUseRawFallback(true);
          } else {
            setHasError(true);
          }
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

export default function SalesReport() {
  const location = useLocation();
  const backHref = location.pathname.startsWith('/crm') ? '/crm/sales' : '/erp/sales';

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);

  const [mode, setMode] = useState<PeriodMode>('DAILY');
  const [startDate, setStartDate] = useState<string>(todayKey);
  const [endDate, setEndDate] = useState<string>(todayKey);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [statusFilter, setStatusFilter] = useState<'PAID' | 'ALL'>('PAID');

  // Seleção de múltiplos dias em modo customizado
  const [rangeSelectionStart, setRangeSelectionStart] = useState<string | null>(null);

  // Queries
  const { data: report, isLoading, isFetching, refetch } = useQuery<SalesReportData>({
    queryKey: ['sales-report', startDate, endDate, statusFilter],
    queryFn: () => salesApi.getReport({
      startDate,
      endDate,
      status: statusFilter,
    }),
  });

  // Funções para definir períodos
  const setDailyPeriod = (d: Date = new Date()) => {
    const key = formatDateKey(d);
    setMode('DAILY');
    setStartDate(key);
    setEndDate(key);
    setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setRangeSelectionStart(null);
  };

  const setWeeklyPeriod = (refDate: Date = new Date()) => {
    setMode('WEEKLY');
    const dayOfWeek = refDate.getDay(); // 0 is Sunday, 1 is Monday...
    // Define início da semana como Segunda-feira (ou Domingo se dayOfWeek === 0)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setStartDate(formatDateKey(monday));
    setEndDate(formatDateKey(sunday));
    setCalendarMonth(new Date(monday.getFullYear(), monday.getMonth(), 1));
    setRangeSelectionStart(null);
  };

  const setMonthlyPeriod = (refDate: Date = new Date()) => {
    setMode('MONTHLY');
    const firstDay = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const lastDay = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);

    setStartDate(formatDateKey(firstDay));
    setEndDate(formatDateKey(lastDay));
    setCalendarMonth(new Date(refDate.getFullYear(), refDate.getMonth(), 1));
    setRangeSelectionStart(null);
  };

  // Navegação anterior / próximo de acordo com o modo atual
  const handlePreviousPeriod = () => {
    const current = parseDateKey(startDate);
    if (mode === 'DAILY') {
      current.setDate(current.getDate() - 1);
      setDailyPeriod(current);
    } else if (mode === 'WEEKLY') {
      current.setDate(current.getDate() - 7);
      setWeeklyPeriod(current);
    } else if (mode === 'MONTHLY') {
      current.setMonth(current.getMonth() - 1);
      setMonthlyPeriod(current);
    } else {
      // Shift calendar month backwards
      setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNextPeriod = () => {
    const current = parseDateKey(startDate);
    if (mode === 'DAILY') {
      current.setDate(current.getDate() + 1);
      setDailyPeriod(current);
    } else if (mode === 'WEEKLY') {
      current.setDate(current.getDate() + 7);
      setWeeklyPeriod(current);
    } else if (mode === 'MONTHLY') {
      current.setMonth(current.getMonth() + 1);
      setMonthlyPeriod(current);
    } else {
      // Shift calendar month forward
      setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  // Clique em um dia do calendário
  const handleDayClick = (dayStr: string) => {
    const clickedDate = parseDateKey(dayStr);

    // Modo CUSTOMIZADO: Seleção ou junção de dias
    if (mode === 'CUSTOM') {
      if (!rangeSelectionStart) {
        // Primeiro clique: inicia seleção de intervalo
        setRangeSelectionStart(dayStr);
        setStartDate(dayStr);
        setEndDate(dayStr);
      } else {
        // Segundo clique: junta os dias selecionados
        const first = parseDateKey(rangeSelectionStart);
        const second = clickedDate;
        if (first <= second) {
          setStartDate(formatDateKey(first));
          setEndDate(formatDateKey(second));
        } else {
          setStartDate(formatDateKey(second));
          setEndDate(formatDateKey(first));
        }
        setRangeSelectionStart(null);
      }
      return;
    }

    // Ao clicar em um dia específico, foca diretamente naquele dia (modo Diário)
    setDailyPeriod(clickedDate);
  };

  // Gerar dias da grade do calendário para o mês exibido
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const daysCount = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0: Dom ... 6: Sáb

    // Dias do mês anterior para preencher a primeira semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevDays = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      prevDays.push({
        date: d,
        dateKey: formatDateKey(d),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }

    // Dias do mês atual
    const currentMonthDays = [];
    for (let i = 1; i <= daysCount; i++) {
      const d = new Date(year, month, i);
      currentMonthDays.push({
        date: d,
        dateKey: formatDateKey(d),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Dias do próximo mês para completar a última semana (até múltiplo de 7)
    const totalFilled = prevDays.length + currentMonthDays.length;
    const remaining = (7 - (totalFilled % 7)) % 7;
    const nextDays = [];
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      nextDays.push({
        date: d,
        dateKey: formatDateKey(d),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return [...prevDays, ...currentMonthDays, ...nextDays];
  }, [calendarMonth]);

  // Período total visível na grade do calendário para carregar quantidades de peças de cada dia
  const calendarGridRange = useMemo(() => {
    if (!calendarDays.length) return { start: '', end: '' };
    return {
      start: calendarDays[0].dateKey,
      end: calendarDays[calendarDays.length - 1].dateKey,
    };
  }, [calendarDays]);

  const { data: calendarReport } = useQuery<SalesReportData>({
    queryKey: ['sales-report-calendar-grid', calendarGridRange.start, calendarGridRange.end, statusFilter],
    queryFn: () => salesApi.getReport({
      startDate: calendarGridRange.start,
      endDate: calendarGridRange.end,
      status: statusFilter,
    }),
    enabled: Boolean(calendarGridRange.start && calendarGridRange.end),
    staleTime: 30 * 1000,
  });

  const calendarDaysStatsMap = useMemo(() => {
    const map = new Map<string, { itemsCount: number; totalSales: number; totalRevenue: number }>();
    if (calendarReport?.timeline) {
      for (const t of calendarReport.timeline) {
        map.set(t.date, {
          itemsCount: t.itemsCount || 0,
          totalSales: t.totalSales || 0,
          totalRevenue: t.totalRevenue || 0,
        });
      }
    }
    return map;
  }, [calendarReport?.timeline]);

  // Verificar se um dia está no intervalo selecionado
  const isDaySelected = (dayKey: string) => {
    return dayKey >= startDate && dayKey <= endDate;
  };

  const isDayStart = (dayKey: string) => dayKey === startDate;
  const isDayEnd = (dayKey: string) => dayKey === endDate;
  const isToday = (dayKey: string) => dayKey === todayKey;

  // Dias selecionados count
  const selectedDaysCount = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const d1 = parseDateKey(startDate).getTime();
    const d2 = parseDateKey(endDate).getTime();
    return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
  }, [startDate, endDate]);

  const summary = report?.summary;
  const patternsRanking = report?.patternsRanking || [];
  const categoriesRanking = report?.categoriesRanking || [];
  const subcategoriesRanking = report?.subcategoriesRanking || [];
  const paymentMethods = report?.paymentMethods || [];
  const timeline = report?.timeline || [];
  const topProducts = report?.topProducts || [];

  const [showAllPatterns, setShowAllPatterns] = useState(false);
  const INITIAL_PATTERNS_COUNT = 9;
  const displayedPatterns = useMemo(() => {
    if (showAllPatterns) return patternsRanking;
    return patternsRanking.slice(0, INITIAL_PATTERNS_COUNT);
  }, [patternsRanking, showAllPatterns]);

  // Calcular valor máximo no timeline para barras proporcionais
  const maxDailyRevenue = useMemo(() => {
    const list = report?.timeline || [];
    if (!list.length) return 1;
    return Math.max(...list.map(t => t.totalRevenue), 1);
  }, [report?.timeline]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <Link
            to={backHref}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Voltar para Vendas"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-pink-100 text-pink-700 rounded-lg">
                <BarChart3 className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  Relatório de Vendas
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Desempenho de estampas, categorias, subcategorias e faturamento
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls: Status e Recarregar */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'PAID' | 'ALL')}
            className="text-xs sm:text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="PAID">Vendas Pagas</option>
            <option value="ALL">Todos os Status</option>
          </select>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors border border-gray-200"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin text-pink-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Seletor de Período e Calendário Interativo */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Barra superior de Modos (Diário, Semanal, Mensal, Personalizado) */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Botões de Seleção Rápida */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 p-1 bg-gray-200/70 rounded-lg text-sm font-medium">
              <button
                type="button"
                onClick={() => setDailyPeriod(today)}
                className={`px-3 py-2 sm:px-4 rounded-md text-xs sm:text-sm transition-all text-center flex items-center justify-center gap-1.5 ${
                  mode === 'DAILY'
                    ? 'bg-white text-pink-600 font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Diário (Hoje)</span>
              </button>

              <button
                type="button"
                onClick={() => setWeeklyPeriod(today)}
                className={`px-3 py-2 sm:px-4 rounded-md text-xs sm:text-sm transition-all text-center flex items-center justify-center gap-1.5 ${
                  mode === 'WEEKLY'
                    ? 'bg-white text-pink-600 font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Semanal</span>
              </button>

              <button
                type="button"
                onClick={() => setMonthlyPeriod(today)}
                className={`px-3 py-2 sm:px-4 rounded-md text-xs sm:text-sm transition-all text-center flex items-center justify-center gap-1.5 ${
                  mode === 'MONTHLY'
                    ? 'bg-white text-pink-600 font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                <span>Mensal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('CUSTOM');
                  setRangeSelectionStart(null);
                }}
                className={`px-3 py-2 sm:px-4 rounded-md text-xs sm:text-sm transition-all text-center flex items-center justify-center gap-1.5 ${
                  mode === 'CUSTOM'
                    ? 'bg-white text-pink-600 font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Juntar Dias</span>
              </button>
            </div>

            {/* Navegação Rápida (< e >) + Label do Intervalo Selecionado */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-xs">
                <button
                  onClick={handlePreviousPeriod}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors"
                  title="Período anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextPeriod}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors"
                  title="Próximo período"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200/80">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {startDate === endDate ? (
                    <span>{formatDisplayDate(startDate)}</span>
                  ) : (
                    <span>
                      {formatDisplayDate(startDate)} até {formatDisplayDate(endDate)} ({selectedDaysCount} dias)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Dica de usabilidade para seleção de múltiplos dias */}
          {mode === 'CUSTOM' && (
            <div className="mt-3 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span>
                {rangeSelectionStart
                  ? `Selecione o segundo dia para juntar com ${formatDisplayDate(rangeSelectionStart)}`
                  : 'Clique no primeiro dia e depois no segundo dia no calendário para juntar múltiplos dias no relatório.'}
              </span>
            </div>
          )}
        </div>

        {/* Grade do Calendário Interativo */}
        <div className="p-4 sm:p-6">
          {/* Header do Mês do Calendário */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 capitalize">
              {MONTH_NAMES[calendarMonth.getMonth()]} de {calendarMonth.getFullYear()}
            </h2>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                title="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
                className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-md border border-gray-200"
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                title="Próximo mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {WEEKDAY_NAMES.map((name, i) => (
              <div key={i} className="py-1">
                {name}
              </div>
            ))}
          </div>

          {/* Células dos dias */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((item, idx) => {
              const isSelected = isDaySelected(item.dateKey);
              const isStart = isDayStart(item.dateKey);
              const isEnd = isDayEnd(item.dateKey);
              const todayFlag = isToday(item.dateKey);
              const dayStats = calendarDaysStatsMap.get(item.dateKey);

              let buttonStyle = 'text-gray-700 hover:bg-pink-50 hover:text-pink-600';

              if (!item.isCurrentMonth) {
                buttonStyle = 'text-gray-300 hover:bg-gray-50';
              }

              if (isSelected) {
                if (isStart || isEnd) {
                  buttonStyle = 'bg-pink-600 text-white font-bold shadow-md ring-2 ring-pink-300';
                } else {
                  buttonStyle = 'bg-pink-100 text-pink-900 font-semibold';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(item.dateKey)}
                  title={
                    dayStats && dayStats.itemsCount > 0
                      ? `${item.dayNum}: ${dayStats.itemsCount} ${dayStats.itemsCount === 1 ? 'peça' : 'peças'} vendidas (${dayStats.totalSales} ${dayStats.totalSales === 1 ? 'venda' : 'vendas'} - ${formatCurrency(dayStats.totalRevenue)})`
                      : `${item.dayNum}: nenhuma venda registrada`
                  }
                  className={`relative flex flex-col items-center justify-center p-1 min-h-[46px] sm:min-h-[52px] rounded-lg text-xs sm:text-sm font-medium transition-all focus:outline-none ${buttonStyle}`}
                >
                  <span className="leading-tight">{item.dayNum}</span>

                  {dayStats && dayStats.itemsCount > 0 ? (
                    <span
                      className={`mt-0.5 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none tracking-tight ${
                        isSelected && (isStart || isEnd)
                          ? 'bg-white/30 text-white'
                          : isSelected
                          ? 'bg-pink-200 text-pink-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {dayStats.itemsCount} un
                    </span>
                  ) : (
                    <span className="h-3 sm:h-3.5" />
                  )}

                  {/* Indicador de Hoje */}
                  {todayFlag && !isSelected && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-pink-500" />
                  )}
                  {todayFlag && isSelected && (isStart || isEnd) && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards de Resumo Executivo (KPIs) - Otimizado para Mobile e Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Faturamento Total */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-gray-500">Faturamento Total</span>
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CircleDollarSign className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-lg sm:text-2xl font-black text-gray-900">
              {isLoading ? '...' : formatCurrency(summary?.totalRevenue || 0)}
            </span>
          </div>
          <div className="mt-1 flex items-center text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            <span>{summary?.totalSales || 0} vendas finalizadas</span>
          </div>
        </div>

        {/* Peças Vendidas */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-gray-500">Peças Vendidas</span>
            <span className="p-2 bg-pink-100 text-pink-700 rounded-lg">
              <ShoppingBag className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-lg sm:text-2xl font-black text-gray-900">
              {isLoading ? '...' : `${summary?.totalItemsSold || 0} un`}
            </span>
          </div>
          <div className="mt-1 flex items-center text-xs text-gray-500">
            <span>Volume total de roupas</span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-gray-500">Ticket Médio</span>
            <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Percent className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-lg sm:text-2xl font-black text-gray-900">
              {isLoading ? '...' : formatCurrency(summary?.averageTicket || 0)}
            </span>
          </div>
          <div className="mt-1 flex items-center text-xs text-gray-500">
            <span>Média por pedido</span>
          </div>
        </div>

        {/* Descontos Concedidos */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-gray-500">Descontos</span>
            <span className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Tag className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-lg sm:text-2xl font-black text-gray-900">
              {isLoading ? '...' : formatCurrency(summary?.totalDiscount || 0)}
            </span>
          </div>
          <div className="mt-1 flex items-center text-xs text-gray-500">
            <span>Total abatido no período</span>
          </div>
        </div>
      </div>

      {/* RANKING DAS ESTAMPAS MAIS VENDIDAS (Destaque Principal Solicitado) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-pink-100 text-pink-700 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Estampas que Mais Saíram
              </h2>
              <p className="text-xs text-gray-500">
                Ranking de estampas mais vendidas com foto da roupa, peças e faturamento
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full self-start sm:self-auto">
            {patternsRanking.length} estampa(s) no período
          </span>
        </div>

        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-pink-500" />
              <p className="text-sm">Carregando dados das estampas...</p>
            </div>
          ) : patternsRanking.length === 0 ? (
            <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Sparkles className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="font-medium text-sm">Nenhuma venda de estampa registrada no período selecionado.</p>
              <p className="text-xs text-gray-400 mt-1">Experimente selecionar outro dia ou intervalo no calendário acima.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {displayedPatterns.map((pat, idx) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  return (
                    <div
                      key={pat.id}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all hover:shadow-md flex flex-col justify-between ${
                        isTop1
                          ? 'border-pink-300 bg-gradient-to-b from-pink-50/40 to-white ring-1 ring-pink-200'
                          : isTop2
                          ? 'border-amber-200 bg-gradient-to-b from-amber-50/20 to-white'
                          : isTop3
                          ? 'border-sky-200 bg-gradient-to-b from-sky-50/20 to-white'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div>
                        {/* Top row: Posição no Ranking + Foto */}
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <ReportThumbnail
                              src={pat.sampleImage}
                              alt={pat.name}
                              fallbackIcon={isTop1 ? <Sparkles className="w-6 h-6 text-pink-600" /> : undefined}
                            />

                            {/* Medalha / Badge */}
                            <span
                              className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-xs pointer-events-none ${
                                isTop1
                                  ? 'bg-amber-400 text-amber-950 ring-2 ring-white'
                                  : isTop2
                                  ? 'bg-slate-300 text-slate-900 ring-2 ring-white'
                                  : isTop3
                                  ? 'bg-amber-700 text-white ring-2 ring-white'
                                  : 'bg-gray-100 text-gray-600 text-[11px]'
                              }`}
                            >
                              {idx + 1}º
                            </span>
                          </div>

                          {/* Informações da estampa */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate" title={pat.name}>
                              {pat.name}
                            </h3>
                            <p className="text-xs text-gray-500 font-mono">
                              Código: #{pat.code}
                            </p>

                            <div className="mt-1 flex items-baseline gap-2">
                              <span className="text-base sm:text-lg font-black text-pink-700">
                                {pat.totalQuantity} un
                              </span>
                              <span className="text-xs text-gray-600 font-medium">
                                ({formatCurrency(pat.totalRevenue)})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Barra de Porcentagem de Vendas */}
                        <div className="mt-3">
                          <div className="flex justify-between items-center text-[11px] text-gray-500 mb-1">
                            <span>Participação nas peças</span>
                            <span className="font-semibold text-gray-700">{pat.percentageOfTotal}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isTop1 ? 'bg-pink-600' : isTop2 ? 'bg-amber-500' : isTop3 ? 'bg-sky-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(4, pat.percentageOfTotal))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão para carregar mais estampas se houver mais de 9 */}
              {patternsRanking.length > INITIAL_PATTERNS_COUNT && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllPatterns(!showAllPatterns)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-colors shadow-xs cursor-pointer"
                  >
                    {showAllPatterns ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Mostrar menos estampas</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>
                          Ver todas as {patternsRanking.length} estampas (+{patternsRanking.length - INITIAL_PATTERNS_COUNT})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO DUPLA: CATEGORIAS E SUBCATEGORIAS MAIS VENDIDAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorias Mais Vendidas */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Tag className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Categorias Mais Vendidas</h3>
                <p className="text-xs text-gray-500">Volume por departamento</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
              {categoriesRanking.length} categorias
            </span>
          </div>

          <div className="p-4 sm:p-5">
            {categoriesRanking.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">Nenhuma categoria registrada no período.</p>
            ) : (
              <div className="space-y-3">
                {categoriesRanking.map((cat, idx) => (
                  <div key={cat.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm text-gray-800 truncate">{cat.name}</span>
                        <span className="text-xs text-gray-400 font-mono">#{cat.code}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-sm text-gray-900">{cat.totalQuantity} un</span>
                        <span className="text-xs text-gray-500 ml-1.5">({formatCurrency(cat.totalRevenue)})</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(3, cat.percentageOfTotal))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subcategorias Mais Vendidas */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Subcategorias Mais Vendidas</h3>
                <p className="text-xs text-gray-500">Modelos e tipos de peças específicas</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
              {subcategoriesRanking.length} subcategorias
            </span>
          </div>

          <div className="p-4 sm:p-5">
            {subcategoriesRanking.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">Nenhuma subcategoria registrada no período.</p>
            ) : (
              <div className="space-y-3">
                {subcategoriesRanking.map((sub, idx) => (
                  <div key={sub.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-sm text-gray-800 truncate block">{sub.name}</span>
                          <span className="text-[11px] text-gray-400">Em {sub.categoryName}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-sm text-gray-900">{sub.totalQuantity} un</span>
                        <span className="text-xs text-gray-500 ml-1.5">({formatCurrency(sub.totalRevenue)})</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(3, sub.percentageOfTotal))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FORMAS DE PAGAMENTO E EVOLUÇÃO DIÁRIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formas de Pagamento */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Formas de Pagamento</h3>
              <p className="text-xs text-gray-500">Distribuição do faturamento</p>
            </div>
          </div>

          {paymentMethods.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">Sem dados de pagamento no período.</p>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((pm, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-semibold text-gray-800">{pm.method}</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(pm.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                    <span>{pm.count} transação(ões)</span>
                    <span>{pm.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(3, pm.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evolução Diária no Período (Gráfico em barras CSS) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Evolução de Vendas no Período</h3>
                <p className="text-xs text-gray-500">Faturamento e volume dia a dia</p>
              </div>
            </div>
          </div>

          {timeline.length === 0 ? (
            <p className="text-xs text-gray-500 py-12 text-center">Nenhum dia com venda registrada no período.</p>
          ) : (
            <div>
              {/* Gráfico visual de barras responsivo */}
              <div className="flex items-end gap-1.5 sm:gap-2 h-44 sm:h-52 pt-6 pb-2 px-1 border-b border-gray-200 overflow-x-auto">
                {timeline.map((point) => {
                  const heightPercent = Math.max(8, Math.round((point.totalRevenue / maxDailyRevenue) * 100));
                  return (
                    <div
                      key={point.date}
                      className="flex-1 min-w-[36px] max-w-[64px] flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-12 z-20 bg-gray-900 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                        <p className="font-bold">{formatCurrency(point.totalRevenue)}</p>
                        <p className="text-gray-300">{point.salesCount} vendas • {point.itemsCount} peças</p>
                      </div>

                      {/* Barra de faturamento */}
                      <div
                        className="w-full bg-indigo-500 hover:bg-pink-600 rounded-t transition-all cursor-pointer group-hover:shadow-md"
                        style={{ height: `${heightPercent}%` }}
                      />

                      {/* Data na base */}
                      <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 mt-2 truncate">
                        {point.formattedDate}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Tabela detalhada dos dias */}
              <div className="mt-4 overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Data</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">Vendas</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">Peças</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {timeline.map((point) => (
                      <tr key={point.date} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-medium text-gray-800">{point.formattedDate}</td>
                        <td className="px-3 py-1.5 text-center text-gray-600">{point.salesCount}</td>
                        <td className="px-3 py-1.5 text-center text-gray-600">{point.itemsCount} un</td>
                        <td className="px-3 py-1.5 text-right font-bold text-gray-900">{formatCurrency(point.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOP PRODUTOS INDIVIDUAIS */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                <PackageCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Top Peças Individuais Mais Vendidas</h3>
                <p className="text-xs text-gray-500">Produtos específicos com maior saída</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
              Top {topProducts.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Produto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estampa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Categoria</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Tam.</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qtd</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {topProducts.map((prod, idx) => (
                  <tr key={prod.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-bold text-gray-400">{idx + 1}º</td>
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2.5">
                      <ReportThumbnail
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-8 h-8"
                        fallbackIcon={
                          <span className="text-xs font-bold text-gray-400">
                            {prod.name.charAt(0)}
                          </span>
                        }
                      />
                      <span className="truncate max-w-xs">{prod.name}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{prod.patternName || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{prod.categoryName || '-'}</td>
                    <td className="px-4 py-3 text-xs text-center text-gray-700 font-semibold">{prod.sizeName || '-'}</td>
                    <td className="px-4 py-3 text-xs text-center font-bold text-gray-900">{prod.totalQuantity} un</td>
                    <td className="px-4 py-3 text-xs text-right font-bold text-pink-700">{formatCurrency(prod.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
