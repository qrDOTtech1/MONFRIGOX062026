'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Printer, Instagram, Smartphone, RefreshCw, Copy, Check, Leaf } from 'lucide-react';
import QRCode from 'qrcode';

const APP_URL = 'https://monfrigo.app';
const BRAND = {
  name: 'MonFrigo',
  tagline: 'Ton frigo intelligent',
  desc: 'Scanne, planifie, cuisine. Zéro gaspi, 100% malin.',
  features: [
    '📷 Scanne tes tickets de caisse',
    '🧊 Gère ton frigo en temps réel',
    '🍳 Recettes avec ce que tu as',
    '📅 Planning repas intelligent',
    '🤖 Assistant culinaire IA',
    '♻️ Anti-gaspillage alimentaire',
  ],
  featuresPlain: [
    'Scanne tes tickets de caisse',
    'Gère ton frigo en temps réel',
    'Recettes avec ce que tu as',
    'Planning repas intelligent',
    'Assistant culinaire IA',
    'Anti-gaspillage alimentaire',
  ],
};

interface Template {
  id: string;
  label: string;
  width: number;
  height: number;
  type: 'print' | 'insta' | 'tiktok' | 'eco';
  icon: typeof Printer;
}

const TEMPLATES: Template[] = [
  { id: 'eco-a5', label: 'Éco A5 (print)', width: 1748, height: 2480, type: 'eco', icon: Leaf },
  { id: 'eco-a4', label: 'Éco A4 (print)', width: 2480, height: 3508, type: 'eco', icon: Leaf },
  { id: 'flyer-a5', label: 'Flyer A5 (print)', width: 1748, height: 2480, type: 'print', icon: Printer },
  { id: 'flyer-a4', label: 'Flyer A4 (print)', width: 2480, height: 3508, type: 'print', icon: Printer },
  { id: 'insta-post', label: 'Post Instagram', width: 1080, height: 1080, type: 'insta', icon: Instagram },
  { id: 'insta-story', label: 'Story Instagram', width: 1080, height: 1920, type: 'insta', icon: Smartphone },
  { id: 'tiktok', label: 'TikTok / Réels', width: 1080, height: 1920, type: 'tiktok', icon: Smartphone },
];

const PROMO_STYLES = [
  { id: 'green', label: 'Vert nature', bg: '#052e16', accent: '#22c55e', text: '#f0fdf4' },
  { id: 'dark', label: 'Noir élégant', bg: '#0a0a0f', accent: '#a78bfa', text: '#f5f3ff' },
  { id: 'orange', label: 'Orange énergie', bg: '#431407', accent: '#f97316', text: '#fff7ed' },
  { id: 'blue', label: 'Bleu frais', bg: '#0c1929', accent: '#38bdf8', text: '#f0f9ff' },
];

const ECO_STYLE = { id: 'eco', label: 'Éco encre', bg: '#ffffff', accent: '#18181b', text: '#18181b' };

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function generateQR(url: string, size: number): Promise<HTMLCanvasElement> {
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, url, {
    width: size,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
  return qrCanvas;
}

async function drawEcoVisual(
  canvas: HTMLCanvasElement,
  template: Template,
  promoCode: string,
  customTagline: string,
) {
  const ctx = canvas.getContext('2d')!;
  const { width: W, height: H } = template;
  canvas.width = W;
  canvas.height = H;

  const scale = Math.min(W, H) / 1080;
  const pad = 80 * scale;
  const black = '#18181b';
  const gray = '#71717a';
  const lightGray = '#e4e4e7';

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  let y = pad;

  // Mascot + App name
  const mascotSize = Math.round(80 * scale);
  try {
    const mascotImg = await loadImage('/mascot-happy.png');
    const nameText = 'MonFrigo.app';
    ctx.font = `bold ${68 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    const nameW = ctx.measureText(nameText).width;
    const totalW = mascotSize + 16 * scale + nameW;
    const startX = (W - totalW) / 2;
    ctx.drawImage(mascotImg, startX, y, mascotSize, mascotSize);
    ctx.fillStyle = black;
    ctx.textAlign = 'left';
    ctx.fillText(nameText, startX + mascotSize + 16 * scale, y + 60 * scale);
    ctx.textAlign = 'center';
  } catch {
    ctx.fillStyle = black;
    ctx.font = `bold ${68 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('MonFrigo.app', W / 2, y + 68 * scale);
  }
  y += 90 * scale;

  // Tagline
  ctx.fillStyle = gray;
  ctx.font = `500 ${32 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText(customTagline || BRAND.tagline, W / 2, y + 32 * scale);
  y += 60 * scale;

  // Thin separator
  ctx.strokeStyle = lightGray;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(W * 0.2, y);
  ctx.lineTo(W * 0.8, y);
  ctx.stroke();
  y += 40 * scale;

  // Description
  ctx.fillStyle = gray;
  ctx.font = `400 ${26 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const descLines = wrapText(ctx, BRAND.desc, W - pad * 2);
  for (const line of descLines) {
    ctx.fillText(line, W / 2, y + 28 * scale);
    y += 36 * scale;
  }
  y += 35 * scale;

  // ── GRATUIT section ──
  ctx.textAlign = 'center';
  ctx.fillStyle = black;
  ctx.font = `bold ${28 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('GRATUIT A VIE', W / 2, y + 28 * scale);
  y += 18 * scale;

  ctx.fillStyle = gray;
  ctx.font = `400 ${18 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Sans carte bancaire, sans limite de temps', W / 2, y + 28 * scale);
  y += 42 * scale;

  const freeFeatures = [
    'Gestion du frigo illimitée',
    'Planning de repas complet',
    'Liste de courses partageable',
    'Mode cuisine pas-à-pas + minuteur',
    'Alertes péremption & anti-gaspi',
    'Scan code-barres (20/sem)',
    'Succès & badges',
  ];
  ctx.textAlign = 'left';
  ctx.font = `400 ${20 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  for (const feat of freeFeatures) {
    const featureX = pad + 30 * scale;
    ctx.fillStyle = black;
    ctx.fillText('✓', featureX - 22 * scale, y + 22 * scale);
    ctx.fillText(feat, featureX, y + 22 * scale);
    y += 34 * scale;
  }
  y += 16 * scale;

  // ── Separator ──
  ctx.strokeStyle = lightGray;
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(W - pad, y);
  ctx.stroke();
  y += 20 * scale;

  // ── Pricing tiers side by side ──
  ctx.textAlign = 'center';
  ctx.fillStyle = gray;
  ctx.font = `500 ${20 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Envie de plus ? Débloquez l\'IA culinaire.', W / 2, y + 22 * scale);
  y += 40 * scale;

  const tierW = (W - pad * 2 - 20 * scale) / 2;
  const tierH = 200 * scale;
  const tierX1 = pad;
  const tierX2 = pad + tierW + 20 * scale;

  // Premium box
  roundRect(ctx, tierX1, y, tierW, tierH, 12 * scale);
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  ctx.fillStyle = black;
  ctx.font = `bold ${22 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Premium', tierX1 + tierW / 2, y + 32 * scale);
  ctx.font = `bold ${28 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('3,99€/mois', tierX1 + tierW / 2, y + 66 * scale);

  ctx.fillStyle = gray;
  ctx.font = `400 ${16 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const premFeats = ['10 requêtes IA/sem', 'Scan frigo IA', 'Toutes les recettes', 'Création recettes IA'];
  let pY = y + 90 * scale;
  for (const f of premFeats) {
    ctx.fillText(f, tierX1 + tierW / 2, pY);
    pY += 24 * scale;
  }

  // VIP box
  roundRect(ctx, tierX2, y, tierW, tierH, 12 * scale);
  ctx.strokeStyle = black;
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();

  ctx.fillStyle = black;
  ctx.font = `bold ${22 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('VIP', tierX2 + tierW / 2, y + 32 * scale);
  ctx.font = `bold ${28 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('6,99€/mois', tierX2 + tierW / 2, y + 66 * scale);

  ctx.fillStyle = gray;
  ctx.font = `400 ${16 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const vipFeats = ['IA illimitée', 'Coach nutritionnel', 'Suivi & stats', 'Support prioritaire'];
  let vY = y + 90 * scale;
  for (const f of vipFeats) {
    ctx.fillText(f, tierX2 + tierW / 2, vY);
    vY += 24 * scale;
  }

  y += tierH + 25 * scale;

  // Promo code
  if (promoCode) {
    ctx.textAlign = 'center';
    const codeBlockH = 80 * scale;
    const codeBlockW = W - pad * 3;
    const codeX = (W - codeBlockW) / 2;

    roundRect(ctx, codeX, y, codeBlockW, codeBlockH, 10 * scale);
    ctx.strokeStyle = black;
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.fillStyle = gray;
    ctx.font = `400 ${18 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText('Code promo :', W / 2, y + 28 * scale);

    ctx.fillStyle = black;
    ctx.font = `bold ${34 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText(promoCode.toUpperCase(), W / 2, y + 64 * scale);

    y += codeBlockH + 20 * scale;
  }

  // QR Code
  ctx.textAlign = 'center';
  const qrSize = Math.round(160 * scale);
  const qrUrl = promoCode ? `${APP_URL}?promo=${promoCode}` : APP_URL;
  const qrY = Math.min(y + 5 * scale, H - (240 * scale));

  try {
    const qrCanvas = await generateQR(qrUrl, qrSize);
    const qrX = W / 2 - qrSize / 2;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = black;
    ctx.font = `bold ${26 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText('monfrigo.app', W / 2, qrY + qrSize + 30 * scale);
  } catch {
    ctx.fillStyle = black;
    ctx.font = `bold ${26 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText('monfrigo.app', W / 2, y + 40 * scale);
  }

  // Bottom
  ctx.fillStyle = gray;
  ctx.font = `400 ${15 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Disponible sur iOS, Android & Web', W / 2, H - pad / 2);

  // Light border
  ctx.strokeStyle = lightGray;
  ctx.lineWidth = 1.5 * scale;
  roundRect(ctx, 6, 6, W - 12, H - 12, 16 * scale);
  ctx.stroke();
}

async function drawVisual(
  canvas: HTMLCanvasElement,
  template: Template,
  style: typeof PROMO_STYLES[0],
  promoCode: string,
  customTagline: string,
) {
  const ctx = canvas.getContext('2d')!;
  const { width: W, height: H } = template;
  canvas.width = W;
  canvas.height = H;

  // Background
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, W, H);

  // Gradient overlay
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, style.accent + '18');
  grad.addColorStop(0.5, 'transparent');
  grad.addColorStop(1, style.accent + '10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative circles
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = style.accent;
  ctx.beginPath(); ctx.arc(W * 0.85, H * 0.12, W * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.1, H * 0.85, W * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  const isPortrait = H > W;
  const scale = Math.min(W, H) / 1080;
  const pad = 80 * scale;

  let y = pad;

  // Mascot + App name
  const mascotSize = Math.round(90 * scale);
  try {
    const mascotImg = await loadImage('/mascot-happy.png');
    const nameText = 'MonFrigo.app';
    ctx.font = `bold ${72 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    const nameW = ctx.measureText(nameText).width;
    const totalW = mascotSize + 16 * scale + nameW;
    const startX = (W - totalW) / 2;
    ctx.drawImage(mascotImg, startX, y, mascotSize, mascotSize);
    ctx.fillStyle = style.accent;
    ctx.textAlign = 'left';
    ctx.fillText(nameText, startX + mascotSize + 16 * scale, y + 65 * scale);
    ctx.textAlign = 'center';
  } catch {
    ctx.fillStyle = style.accent;
    ctx.font = `bold ${72 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('MonFrigo.app', W / 2, y + 72 * scale);
  }
  y += 100 * scale;

  // Tagline
  ctx.fillStyle = style.text;
  ctx.font = `600 ${36 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText(customTagline || BRAND.tagline, W / 2, y + 36 * scale);
  y += 70 * scale;

  // Separator
  ctx.strokeStyle = style.accent + '40';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(W * 0.25, y);
  ctx.lineTo(W * 0.75, y);
  ctx.stroke();
  y += 40 * scale;

  // Description
  ctx.fillStyle = style.text + 'cc';
  ctx.font = `400 ${28 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const descLines = wrapText(ctx, BRAND.desc, W - pad * 2);
  for (const line of descLines) {
    ctx.fillText(line, W / 2, y + 30 * scale);
    y += 38 * scale;
  }
  y += 30 * scale;

  // ── "Gratuit à vie" banner ──
  ctx.textAlign = 'center';
  ctx.fillStyle = style.accent;
  ctx.font = `bold ${26 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('GRATUIT À VIE — SANS CARTE BANCAIRE', W / 2, y + 26 * scale);
  y += 44 * scale;

  // Free features as pills
  const freeFeats = ['Frigo illimité', 'Planning repas', 'Courses', 'Mode cuisine', 'Anti-gaspi', 'Badges'];
  ctx.font = `500 ${18 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  let pillX = pad;
  let pillY = y;
  const pillH = 32 * scale;
  const pillGap = 8 * scale;
  for (const feat of freeFeats) {
    const tw = ctx.measureText('✓ ' + feat).width + 20 * scale;
    if (pillX + tw > W - pad) { pillX = pad; pillY += pillH + pillGap; }
    roundRect(ctx, pillX, pillY, tw, pillH, 8 * scale);
    ctx.fillStyle = style.accent + '20';
    ctx.fill();
    ctx.fillStyle = style.text;
    ctx.textAlign = 'left';
    ctx.fillText('✓ ' + feat, pillX + 10 * scale, pillY + 22 * scale);
    ctx.textAlign = 'center';
    pillX += tw + pillGap;
  }
  y = pillY + pillH + 30 * scale;

  // ── Pricing tiers ──
  const tierW = (W - pad * 2 - 16 * scale) / 2;
  const tierH = isPortrait ? 190 * scale : 170 * scale;
  const tierX1 = pad;
  const tierX2 = pad + tierW + 16 * scale;

  // Premium tier
  roundRect(ctx, tierX1, y, tierW, tierH, 14 * scale);
  ctx.fillStyle = style.accent + '10';
  ctx.fill();
  ctx.strokeStyle = style.accent + '40';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  ctx.fillStyle = style.text;
  ctx.font = `bold ${22 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Premium', tierX1 + tierW / 2, y + 30 * scale);
  ctx.fillStyle = style.accent;
  ctx.font = `bold ${26 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('3,99€/mois', tierX1 + tierW / 2, y + 60 * scale);
  ctx.fillStyle = style.text + 'aa';
  ctx.font = `400 ${15 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const pFeats = ['10 requêtes IA/sem', 'Scan frigo IA', '100% des recettes', 'Création recettes IA'];
  let pFY = y + 84 * scale;
  for (const f of pFeats) { ctx.fillText(f, tierX1 + tierW / 2, pFY); pFY += 22 * scale; }

  // VIP tier
  roundRect(ctx, tierX2, y, tierW, tierH, 14 * scale);
  ctx.fillStyle = style.accent + '18';
  ctx.fill();
  ctx.strokeStyle = style.accent;
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();

  ctx.fillStyle = style.text;
  ctx.font = `bold ${22 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('VIP', tierX2 + tierW / 2, y + 30 * scale);
  ctx.fillStyle = style.accent;
  ctx.font = `bold ${26 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('6,99€/mois', tierX2 + tierW / 2, y + 60 * scale);
  ctx.fillStyle = style.text + 'aa';
  ctx.font = `400 ${15 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const vFeats = ['IA illimitée', 'Coach nutritionnel', 'Stats & suivi nutri', 'Support prioritaire'];
  let vFY = y + 84 * scale;
  for (const f of vFeats) { ctx.fillText(f, tierX2 + tierW / 2, vFY); vFY += 22 * scale; }

  y += tierH + 20 * scale;

  // Promo code
  if (promoCode) {
    ctx.textAlign = 'center';
    const codeBlockH = 90 * scale;
    const codeBlockW = W - pad * 2.5;
    const codeX = (W - codeBlockW) / 2;

    roundRect(ctx, codeX, y, codeBlockW, codeBlockH, 14 * scale);
    ctx.fillStyle = style.accent + '20';
    ctx.fill();
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();

    ctx.fillStyle = style.text + 'aa';
    ctx.font = `500 ${18 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText('Code promo exclusif :', W / 2, y + 30 * scale);

    ctx.fillStyle = style.accent;
    ctx.font = `bold ${36 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText(promoCode.toUpperCase(), W / 2, y + 68 * scale);

    y += codeBlockH + 18 * scale;
  }

  // QR Code
  ctx.textAlign = 'center';
  const qrSize = Math.round(140 * scale);
  const qrUrl = promoCode ? `${APP_URL}?promo=${promoCode}` : APP_URL;
  const qrX = W / 2 - qrSize / 2;
  const qrY = Math.min(y + 5 * scale, H - 230 * scale);

  roundRect(ctx, qrX - 10 * scale, qrY - 10 * scale, qrSize + 20 * scale, qrSize + 20 * scale, 14 * scale);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  try {
    const qrCanvas = await generateQR(qrUrl, qrSize);
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
  } catch {}

  ctx.fillStyle = style.accent;
  ctx.font = `bold ${28 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('monfrigo.app', W / 2, qrY + qrSize + 35 * scale);

  // Bottom
  ctx.fillStyle = style.text + '55';
  ctx.font = `400 ${16 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Disponible sur iOS, Android & Web', W / 2, H - pad / 2);

  // Border
  ctx.strokeStyle = style.accent + '25';
  ctx.lineWidth = 4 * scale;
  roundRect(ctx, 8, 8, W - 16, H - 16, 24 * scale);
  ctx.stroke();
}

export default function ProspectionPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('eco-a5');
  const [selectedStyle, setSelectedStyle] = useState<string>('green');
  const [promoCode, setPromoCode] = useState('');
  const [customTagline, setCustomTagline] = useState('');
  const [promoCodes, setPromoCodes] = useState<Array<{ code: string; description: string }>>([]);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch('/api/admin/promo').then(r => r.ok ? r.json() : []).then(data => {
      if (Array.isArray(data)) setPromoCodes(data.filter((p: any) => p.isActive));
    }).catch(() => {});
  }, []);

  const template = TEMPLATES.find(t => t.id === selectedTemplate)!;
  const style = PROMO_STYLES.find(s => s.id === selectedStyle)!;
  const isEco = template.type === 'eco';

  const renderPreview = useCallback(async () => {
    if (!previewRef.current) return;
    if (isEco) {
      await drawEcoVisual(previewRef.current, template, promoCode, customTagline);
    } else {
      await drawVisual(previewRef.current, template, style, promoCode, customTagline);
    }
  }, [template, style, promoCode, customTagline, isEco]);

  useEffect(() => { renderPreview(); }, [renderPreview]);

  async function downloadPNG() {
    const canvas = document.createElement('canvas');
    if (isEco) {
      await drawEcoVisual(canvas, template, promoCode, customTagline);
    } else {
      await drawVisual(canvas, template, style, promoCode, customTagline);
    }
    const link = document.createElement('a');
    link.download = `monfrigo-${template.id}${promoCode ? '-' + promoCode : ''}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function copyToClipboard() {
    if (!previewRef.current) return;
    previewRef.current.toBlob(blob => {
      if (!blob) return;
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    });
  }

  async function downloadAll() {
    for (const t of TEMPLATES) {
      const canvas = document.createElement('canvas');
      const s = t.type === 'eco' ? ECO_STYLE : style;
      if (t.type === 'eco') {
        await drawEcoVisual(canvas, t, promoCode, customTagline);
      } else {
        await drawVisual(canvas, t, s, promoCode, customTagline);
      }
      const link = document.createElement('a');
      link.download = `monfrigo-${t.id}${promoCode ? '-' + promoCode : ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }

  const previewAspect = template.height / template.width;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">📣 Prospection</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Génère des visuels promo pour imprimer ou publier sur les réseaux.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Format */}
          <div className="card p-4">
            <h3 className="text-sm font-bold mb-3">Format</h3>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => {
                const Icon = t.icon;
                const isEcoT = t.type === 'eco';
                return (
                  <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left"
                    style={{
                      backgroundColor: selectedTemplate === t.id ? (isEcoT ? '#18181b' : 'var(--accent)') : 'var(--bg-inset)',
                      color: selectedTemplate === t.id ? '#fff' : 'var(--text)',
                      border: selectedTemplate === t.id ? `2px solid ${isEcoT ? '#18181b' : 'var(--accent)'}` : '1px solid var(--border-subtle)',
                    }}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-semibold">{t.label}</p>
                      <p className="text-[10px] opacity-70">{t.width}×{t.height}px</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Style - hidden for eco */}
          {!isEco && (
            <div className="card p-4">
              <h3 className="text-sm font-bold mb-3">Style</h3>
              <div className="flex gap-2">
                {PROMO_STYLES.map(s => (
                  <button key={s.id} onClick={() => setSelectedStyle(s.id)}
                    className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all"
                    style={{
                      border: selectedStyle === s.id ? `2px solid ${s.accent}` : '1px solid var(--border-subtle)',
                      backgroundColor: selectedStyle === s.id ? s.bg : 'var(--bg-inset)',
                    }}>
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: s.accent }} />
                    <span className="text-[10px] font-medium" style={{ color: selectedStyle === s.id ? s.accent : 'var(--text-muted)' }}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isEco && (
            <div className="card p-4 flex items-start gap-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Leaf className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-900">Mode éco-encre</p>
                <p className="text-xs text-green-700 mt-0.5">
                  Fond blanc, texte noir, zéro aplat de couleur. Idéal pour imprimer en masse à bas coût en noir & blanc.
                </p>
              </div>
            </div>
          )}

          {/* Promo code */}
          <div className="card p-4">
            <h3 className="text-sm font-bold mb-3">Code promo (optionnel)</h3>
            {promoCodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {promoCodes.map(p => (
                  <button key={p.code} onClick={() => setPromoCode(p.code)}
                    className="text-[10px] px-2.5 py-1 rounded-full transition-all"
                    style={{
                      backgroundColor: promoCode === p.code ? 'var(--accent)' : 'var(--bg-inset)',
                      color: promoCode === p.code ? 'var(--accent-text)' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                    {p.code}
                  </button>
                ))}
              </div>
            )}
            <input value={promoCode} onChange={e => setPromoCode(e.target.value)}
              placeholder="Ex: BIENVENUE2026"
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>

          {/* Custom tagline */}
          <div className="card p-4">
            <h3 className="text-sm font-bold mb-3">Slogan personnalisé</h3>
            <input value={customTagline} onChange={e => setCustomTagline(e.target.value)}
              placeholder={BRAND.tagline}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={downloadPNG}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              <Download className="w-4 h-4" /> Télécharger PNG
            </button>
            <button onClick={copyToClipboard}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={() => renderPreview()}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="card p-4">
          <h3 className="text-sm font-bold mb-3">Aperçu</h3>
          <div className="flex justify-center" style={isEco ? { backgroundColor: '#f4f4f5', padding: '1rem', borderRadius: '0.75rem' } : {}}>
            <canvas
              ref={previewRef}
              className="rounded-xl shadow-2xl"
              style={{
                width: '100%',
                maxWidth: previewAspect > 1 ? '320px' : '100%',
                aspectRatio: `${template.width} / ${template.height}`,
              }}
            />
          </div>
          <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
            {template.label} — {template.width}×{template.height}px — PNG haute qualité
            {isEco && ' — Optimisé impression N&B'}
          </p>
        </div>
      </div>

      {/* Quick batch */}
      <div className="card p-4">
        <h3 className="text-sm font-bold mb-3">Téléchargement rapide (tous les formats)</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Génère et télécharge tous les formats d'un coup avec le style et code promo actuels.
        </p>
        <button onClick={downloadAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
          <Download className="w-4 h-4" /> Tout télécharger ({TEMPLATES.length} visuels)
        </button>
      </div>
    </div>
  );
}
