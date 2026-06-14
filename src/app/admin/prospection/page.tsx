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
  { id: 'ticket-80x50', label: 'Ticket 80×50mm', width: 950, height: 600, type: 'print', icon: Printer },
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

async function drawTicketVisual(
  canvas: HTMLCanvasElement,
  template: Template,
  promoCode: string,
  customTagline: string,
) {
  const ctx = canvas.getContext('2d')!;
  const W = 950;
  const H = 600;
  canvas.width = W;
  canvas.height = H;

  const black = '#000000';
  const white = '#ffffff';
  const darkGray = '#333333';

  // Fond blanc
  ctx.fillStyle = white;
  ctx.fillRect(0, 0, W, H);

  // ── ZONES fixes pour éviter tout chevauchement ──
  const HEADER_H = 60;
  const FOOTER_H = 44;
  const CONTENT_TOP = HEADER_H;
  const CONTENT_BOT = H - FOOTER_H;
  const CONTENT_H = CONTENT_BOT - CONTENT_TOP; // 496px

  // Zone gauche QR : x=0..310, QR centré verticalement
  const QR_ZONE_W = 310;
  const QR_SIZE = 250;
  const QR_X = (QR_ZONE_W - QR_SIZE) / 2;
  const QR_Y = CONTENT_TOP + (CONTENT_H - QR_SIZE) / 2;

  // Zone droite content : x=324..940
  const SEP_X = QR_ZONE_W + 7;
  const CONT_X = SEP_X + 10;
  const CONT_W = W - CONT_X - 12;
  const HALF_W = CONT_W / 2;

  // ── 1. HEADER ──
  ctx.fillStyle = black;
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.fillStyle = white;
  ctx.textAlign = 'left';
  ctx.font = `900 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('MonFrigo', 14, 38);
  ctx.fillStyle = '#aaaaaa';
  ctx.font = `400 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('.app', 14 + ctx.measureText('MonFrigo').width, 38);

  // Mascot in header right
  try {
    const mascotImg = await loadImage('/mascot-happy.png');
    ctx.drawImage(mascotImg, W - 54, 5, 48, 48);
  } catch {}

  // ── 2. QR ──
  const qrUrl = promoCode ? `${APP_URL}?promo=${promoCode}` : APP_URL;
  try {
    const qrCanvas = await generateQR(qrUrl, QR_SIZE);
    ctx.drawImage(qrCanvas, QR_X, QR_Y, QR_SIZE, QR_SIZE);
  } catch {}

  // Label sous QR
  ctx.fillStyle = darkGray;
  ctx.textAlign = 'center';
  ctx.font = `bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('monfrigo.app', QR_ZONE_W / 2, QR_Y + QR_SIZE + 20);

  // ── 3. SEPARATEUR VERTICAL ──
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(SEP_X, CONTENT_TOP + 10);
  ctx.lineTo(SEP_X, CONTENT_BOT - 10);
  ctx.stroke();

  // ── 4. CONTENU DROIT ──
  // Distribue le contenu sur CONTENT_H (496px) en sections fixes
  let ry = CONTENT_TOP;

  // "GRATUIT À VIE" gros — centré dans colonne droite
  ry += 20;
  ctx.fillStyle = black;
  ctx.textAlign = 'center';
  ctx.font = `900 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('GRATUIT À VIE', CONT_X + CONT_W / 2, ry + 28);
  ry += 40;

  // Sous-titre
  ctx.fillStyle = darkGray;
  ctx.font = `400 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Sans carte bancaire · Pour toujours', CONT_X + CONT_W / 2, ry + 13);
  ry += 28;

  // Ligne séparatrice légère
  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CONT_X + 10, ry);
  ctx.lineTo(CONT_X + CONT_W - 10, ry);
  ctx.stroke();
  ry += 14;

  // Features en 2 colonnes × 3 lignes (6 features)
  const features = ['📷 Scan frigo', '🍳 Recettes', '📅 Planning', '🛒 Courses', '♻️ Anti-gaspi', '✓ Badges'];
  ctx.textAlign = 'left';
  ctx.fillStyle = black;
  ctx.font = `600 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const ROW_H = 26;
  for (let i = 0; i < 6; i++) {
    const col = i < 3 ? 0 : 1;
    const row = i < 3 ? i : i - 3;
    const fx = CONT_X + col * HALF_W + 4;
    const fy = ry + row * ROW_H + 16;
    ctx.fillText(features[i], fx, fy);
  }
  ry += 3 * ROW_H + 12;

  // Ligne séparatrice
  if (promoCode) {
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CONT_X + 10, ry);
    ctx.lineTo(CONT_X + CONT_W - 10, ry);
    ctx.stroke();
    ry += 12;

    // Promo code
    ctx.fillStyle = darkGray;
    ctx.textAlign = 'center';
    ctx.font = `600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText('CODE EXCLUSIF', CONT_X + CONT_W / 2, ry + 11);
    ry += 18;

    ctx.fillStyle = black;
    ctx.font = `900 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText(promoCode.toUpperCase(), CONT_X + CONT_W / 2, ry + 26);
    ry += 36;
  }

  // PWA CTA (fill rest of space)
  const ctaY = Math.max(ry + 8, CONTENT_BOT - 60);
  ctx.textAlign = 'center';
  ctx.fillStyle = black;
  ctx.font = `bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Web App — Sans téléchargement', CONT_X + CONT_W / 2, ctaY + 13);
  ctx.fillStyle = darkGray;
  ctx.font = `400 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Ouvre directement depuis ton navigateur', CONT_X + CONT_W / 2, ctaY + 28);

  // ── 5. FOOTER ──
  ctx.fillStyle = black;
  ctx.fillRect(0, CONTENT_BOT, W, FOOTER_H);
  ctx.fillStyle = white;
  ctx.textAlign = 'center';
  ctx.font = `900 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('📱 SCANNE & UTILISE MAINTENANT — GRATUIT', W / 2, CONTENT_BOT + 27);

  // ── 6. BORDURE ──
  ctx.strokeStyle = black;
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, W - 4, H - 4);
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
  const pad = 60 * scale;
  const dark = '#18181b';
  const gray = '#52525b';
  const lightGray = '#a1a1aa';

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ── TOP: Encadrés légers — ZÉRO aplat noir ──
  // Ligne fine en haut
  ctx.fillStyle = dark;
  ctx.fillRect(pad, 0, W - pad * 2, 4 * scale);

  // Logo + mascot — texte pur, pas de fond
  let y = 30 * scale;
  const mascotSize = Math.round(80 * scale);
  try {
    const mascotImg = await loadImage('/mascot-happy.png');
    const nameText = 'MonFrigo.app';
    ctx.font = `900 ${58 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    const nameW = ctx.measureText(nameText).width;
    const totalW = mascotSize + 16 * scale + nameW;
    const startX = (W - totalW) / 2;
    ctx.drawImage(mascotImg, startX, y, mascotSize, mascotSize);
    ctx.fillStyle = dark;
    ctx.textAlign = 'left';
    ctx.fillText(nameText, startX + mascotSize + 16 * scale, y + mascotSize * 0.75);
  } catch {
    ctx.fillStyle = dark;
    ctx.font = `900 ${58 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('MonFrigo.app', W / 2, y + mascotSize * 0.75);
  }
  ctx.textAlign = 'center';

  // Ligne séparatrice fine sous le logo
  y += mascotSize + 20 * scale;
  ctx.fillStyle = '#d4d4d8';
  ctx.fillRect(pad, y, W - pad * 2, 2 * scale);

  // ── BIG HOOK ──
  y += 30 * scale;

  ctx.fillStyle = dark;
  ctx.font = `900 ${58 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const hookLines = wrapText(ctx, customTagline || 'Tu sais pas quoi cuisiner ce soir ?', W - pad * 2);
  for (const line of hookLines) {
    ctx.fillText(line, W / 2, y + 58 * scale);
    y += 68 * scale;
  }
  y += 10 * scale;

  ctx.fillStyle = gray;
  ctx.font = `500 ${30 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('On a la solution. Et c\'est gratuit.', W / 2, y + 30 * scale);
  y += 65 * scale;

  // ── 3 big selling points ──
  const points = [
    { icon: '📷', text: 'Scanne ton frigo' },
    { icon: '🍳', text: 'Reçois des recettes' },
    { icon: '📅', text: 'Planifie ta semaine' },
  ];

  const pointW = (W - pad * 2 - 30 * scale) / 3;
  for (let i = 0; i < 3; i++) {
    const px = pad + i * (pointW + 15 * scale);
    const centerX = px + pointW / 2;

    ctx.font = `${52 * scale}px -apple-system, sans-serif`;
    ctx.fillText(points[i].icon, centerX, y + 52 * scale);

    ctx.fillStyle = dark;
    ctx.font = `bold ${22 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText(points[i].text, centerX, y + 90 * scale);
    ctx.fillStyle = gray;
  }
  y += 120 * scale;

  // Arrow down
  ctx.fillStyle = dark;
  ctx.font = `${36 * scale}px -apple-system, sans-serif`;
  ctx.fillText('▼', W / 2, y + 20 * scale);
  y += 50 * scale;

  // ── GRATUIT À VIE block ──
  const freeBlockH = 260 * scale;
  roundRect(ctx, pad, y, W - pad * 2, freeBlockH, 16 * scale);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3 * scale;
  ctx.stroke();

  ctx.fillStyle = dark;
  ctx.font = `900 ${36 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('GRATUIT À VIE', W / 2, y + 46 * scale);

  ctx.fillStyle = gray;
  ctx.font = `500 ${20 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Sans carte bancaire — pour toujours', W / 2, y + 74 * scale);

  const freeFeatures = [
    '✓  Frigo & courses illimités',
    '✓  Planning repas complet',
    '✓  Mode cuisine pas-à-pas',
    '✓  Alertes péremption',
    '✓  Anti-gaspi & badges',
  ];
  ctx.textAlign = 'left';
  ctx.fillStyle = dark;
  ctx.font = `600 ${22 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  let fY = y + 106 * scale;
  const col1X = pad + 40 * scale;
  const col2X = W / 2 + 10 * scale;
  for (let i = 0; i < freeFeatures.length; i++) {
    const fx = i < 3 ? col1X : col2X;
    const fy = i < 3 ? fY + i * 34 * scale : fY + (i - 3) * 34 * scale;
    ctx.fillText(freeFeatures[i], fx, fy);
  }
  ctx.textAlign = 'center';

  y += freeBlockH + 25 * scale;

  // ── Pricing tiers ──
  ctx.fillStyle = gray;
  ctx.font = `500 ${22 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Envie de l\'IA culinaire en plus ?', W / 2, y + 22 * scale);
  y += 46 * scale;

  const tierW = (W - pad * 2 - 24 * scale) / 2;
  const tierH = 180 * scale;
  const tierX1 = pad;
  const tierX2 = pad + tierW + 24 * scale;

  // Premium
  roundRect(ctx, tierX1, y, tierW, tierH, 12 * scale);
  ctx.strokeStyle = '#a1a1aa';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  ctx.fillStyle = dark;
  ctx.font = `bold ${24 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Premium', tierX1 + tierW / 2, y + 34 * scale);
  ctx.font = `900 ${32 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('3,99€', tierX1 + tierW / 2, y + 72 * scale);
  ctx.fillStyle = gray;
  ctx.font = `400 ${16 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('/mois', tierX1 + tierW / 2, y + 92 * scale);

  ctx.font = `500 ${17 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const pFeats = ['10 requêtes IA/sem', 'Scan frigo IA', '100% des recettes'];
  let pFY = y + 118 * scale;
  for (const f of pFeats) { ctx.fillText(f, tierX1 + tierW / 2, pFY); pFY += 22 * scale; }

  // VIP
  roundRect(ctx, tierX2, y, tierW, tierH, 12 * scale);
  ctx.fillStyle = dark;
  ctx.fillRect(tierX2 + 1, y + 1, tierW - 2, tierH - 2);
  roundRect(ctx, tierX2, y, tierW, tierH, 12 * scale);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${24 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('VIP', tierX2 + tierW / 2, y + 34 * scale);
  ctx.font = `900 ${32 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('6,99€', tierX2 + tierW / 2, y + 72 * scale);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = `400 ${16 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('/mois', tierX2 + tierW / 2, y + 92 * scale);

  ctx.fillStyle = '#d4d4d8';
  ctx.font = `500 ${17 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  const vFeats = ['IA illimitée', 'Coach nutritionnel', 'Stats & suivi'];
  let vFY = y + 118 * scale;
  for (const f of vFeats) { ctx.fillText(f, tierX2 + tierW / 2, vFY); vFY += 22 * scale; }

  y += tierH + 25 * scale;

  // ── Promo code ──
  if (promoCode) {
    const codeBlockH = 80 * scale;
    const codeBlockW = W - pad * 2;
    roundRect(ctx, pad, y, codeBlockW, codeBlockH, 10 * scale);
    ctx.fillStyle = '#f4f4f5';
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    ctx.fillStyle = gray;
    ctx.font = `500 ${18 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText('Code promo :', W / 2, y + 28 * scale);

    ctx.fillStyle = dark;
    ctx.font = `900 ${36 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillText(promoCode.toUpperCase(), W / 2, y + 64 * scale);

    y += codeBlockH + 15 * scale;
  }

  // ── Bottom: QR + URL side by side ──
  const bottomY = Math.max(y + 5 * scale, H - 220 * scale);
  const qrSize = Math.round(150 * scale);
  const qrUrl = promoCode ? `${APP_URL}?promo=${promoCode}` : APP_URL;

  // QR on left
  const qrX = W / 2 - qrSize - 30 * scale;
  try {
    const qrCanvas = await generateQR(qrUrl, qrSize);
    ctx.drawImage(qrCanvas, qrX, bottomY, qrSize, qrSize);
  } catch {}

  // URL + CTA on right
  const rightX = W / 2 + 20 * scale;
  ctx.textAlign = 'left';
  ctx.fillStyle = dark;
  ctx.font = `900 ${38 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('monfrigo.app', rightX, bottomY + 50 * scale);

  ctx.fillStyle = gray;
  ctx.font = `500 ${20 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Scanne & utilise', rightX, bottomY + 85 * scale);
  ctx.fillText('maintenant !', rightX, bottomY + 110 * scale);
  ctx.fillStyle = lightGray;
  ctx.font = `400 ${16 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Web App — sans téléchargement', rightX, bottomY + 140 * scale);

  ctx.textAlign = 'center';

  // Footer — ligne fine + texte, zéro fond noir
  ctx.fillStyle = '#d4d4d8';
  ctx.fillRect(pad, H - 36 * scale, W - pad * 2, 1.5 * scale);
  ctx.fillStyle = lightGray;
  ctx.font = `400 ${14 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText('Web App gratuite · Aucun téléchargement requis · monfrigo.app', W / 2, H - 14 * scale);

  // Bold border
  ctx.strokeStyle = dark;
  ctx.lineWidth = 4 * scale;
  roundRect(ctx, 4, 4, W - 8, H - 8, 12 * scale);
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
  ctx.fillText('Web App gratuite · Aucun téléchargement · monfrigo.app', W / 2, H - pad / 2);

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
  const isTicket = template.id.startsWith('ticket');

  const renderPreview = useCallback(async () => {
    if (!previewRef.current) return;
    if (isTicket) {
      await drawTicketVisual(previewRef.current, template, promoCode, customTagline);
    } else if (isEco) {
      await drawEcoVisual(previewRef.current, template, promoCode, customTagline);
    } else {
      await drawVisual(previewRef.current, template, style, promoCode, customTagline);
    }
  }, [template, style, promoCode, customTagline, isEco, isTicket]);

  useEffect(() => { renderPreview(); }, [renderPreview]);

  async function downloadPNG() {
    const canvas = document.createElement('canvas');
    if (isTicket) {
      await drawTicketVisual(canvas, template, promoCode, customTagline);
    } else if (isEco) {
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
      if (t.id.startsWith('ticket')) {
        await drawTicketVisual(canvas, t, promoCode, customTagline);
      } else if (t.type === 'eco') {
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
