import type { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'work',
    name: 'Activité Pro & Travail',
    color: '#1d4ed8',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  {
    id: 'leisure',
    name: 'Détente & Loisirs',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  {
    id: 'personal',
    name: 'Maison & Quotidien',
    color: '#047857',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  {
    id: 'health',
    name: 'Santé & Bien-être',
    color: '#be185d',
    bgColor: '#fdf2f8',
    borderColor: '#fbcfe8',
  },
  {
    id: 'shopping',
    name: 'Courses & Achats',
    color: '#b45309',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  {
    id: 'admin',
    name: 'Admin & Finances',
    color: '#4338ca',
    bgColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  {
    id: 'ideas',
    name: 'Idées & Projets',
    color: '#0e7490',
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc',
  },
  {
    id: 'calls',
    name: 'Appels & Rendez-vous',
    color: '#059669',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
];

export const CATEGORY_PALETTE = [
  { color: '#1d4ed8', bgColor: '#eff6ff', borderColor: '#bfdbfe' },
  { color: '#047857', bgColor: '#ecfdf5', borderColor: '#a7f3d0' },
  { color: '#6d28d9', bgColor: '#f5f3ff', borderColor: '#ddd6fe' },
  { color: '#b45309', bgColor: '#fffbeb', borderColor: '#fde68a' },
  { color: '#be185d', bgColor: '#fdf2f8', borderColor: '#fbcfe8' },
  { color: '#4338ca', bgColor: '#eef2ff', borderColor: '#c7d2fe' },
  { color: '#0e7490', bgColor: '#ecfeff', borderColor: '#a5f3fc' },
  { color: '#b91c1c', bgColor: '#fef2f2', borderColor: '#fecaca' },
  { color: '#0f766e', bgColor: '#f0fdfa', borderColor: '#99f6e4' },
  { color: '#c2410c', bgColor: '#fff7ed', borderColor: '#fed7aa' },
];

export const GROQ_MODELS = [
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra-rapide)' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Raisonnement avancé)' },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B (Modèle puissant)' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B (Instantané)' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k contexte)' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT (Google)' },
];

export const EXAMPLE_BRAINDUMP = `Acheter du café, du pain et du beurre au supermarché
Appeler le dentiste pour décaler le rdv de mardi à 15h
Préparer la présentation client pour la réunion de jeudi matin
Payer la facture d'électricité avant la fin du mois
Aller courir 45 minutes ce soir
Envoyer un mail à Lucas pour le compte-rendu du projet
Commander un cadeau d'anniversaire pour Sophie
Réserver les billets de train pour le weekend à Lyon
Faire une sauvegarde du disque dur externe`;
