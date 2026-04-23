import { GitBranch, ArrowRight, Repeat, Lock, MinusCircle } from 'lucide-react';

// 语义化关系配置：森林地图视觉暗示
export const RELATION_MAP = {
  补充: {
    label: '补充',
    Icon: GitBranch,
    iconSize: 14,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    hint: '分支生长：细粒度展开',
  },
  对立: {
    label: '对立',
    Icon: MinusCircle,
    iconSize: 14,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-800/40',
    hint: '红色警示：逻辑矛盾',
  },
  因果: {
    label: '因果',
    Icon: ArrowRight,
    iconSize: 14,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800/40',
    hint: '箭头指向：因果传导',
  },
  相似: {
    label: '相似',
    Icon: Repeat,
    iconSize: 14,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800/40',
    hint: '虚线共振：同构模式',
  },
  前提: {
    label: '前提',
    Icon: Lock,
    iconSize: 14,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800/40',
    hint: '前置锁链：理解基础',
  },
  延伸: {
    label: '延伸',
    Icon: GitBranch,
    iconSize: 14,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800/40',
    hint: '向外探索',
  },
};
