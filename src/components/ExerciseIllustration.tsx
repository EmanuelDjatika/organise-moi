import React from 'react';

interface ExerciseIllustrationProps {
  exerciseId: string;
  className?: string;
  size?: number;
}

export const ExerciseIllustration: React.FC<ExerciseIllustrationProps> = ({
  exerciseId,
  className = '',
  size = 90,
}) => {
  // SVG viewBox is 0 0 160 120 for consistent aspect ratio
  const renderIllustration = () => {
    switch (exerciseId) {
      // 1. CARDIO
      case 'jumping-jacks':
        return (
          <g>
            {/* Movement motion lines */}
            <path d="M 40 40 Q 55 25 70 30" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3,3" fill="none" />
            <path d="M 120 40 Q 105 25 90 30" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3,3" fill="none" />
            <path d="M 40 100 Q 50 112 65 110" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3,3" fill="none" />
            <path d="M 120 100 Q 110 112 95 110" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3,3" fill="none" />
            
            {/* Ground shadow */}
            <ellipse cx="80" cy="112" rx="45" ry="5" fill="#f1f5f9" />
            
            {/* Head */}
            <circle cx="80" cy="24" r="9" fill="#2563eb" />
            {/* Torso */}
            <line x1="80" y1="33" x2="80" y2="70" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
            {/* Left Arm (raised up-out) */}
            <polyline points="80,42 52,30 40,16" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            {/* Right Arm (raised up-out) */}
            <polyline points="80,42 108,30 120,16" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            {/* Left Leg (jumping apart) */}
            <polyline points="80,68 60,90 46,110" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            {/* Right Leg (jumping apart) */}
            <polyline points="80,68 100,90 114,110" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            {/* Star burst accents */}
            <circle cx="80" cy="12" r="2.5" fill="#f59e0b" />
          </g>
        );

      case 'burpees':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            {/* Dynamic arrow indicating ground-to-jump */}
            <path d="M 28 85 Q 50 40 85 30" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2" fill="none" />
            <polygon points="88,28 80,26 84,33" fill="#ef4444" />
            {/* Athlete in explosive tuck pushup position */}
            <circle cx="120" cy="42" r="8" fill="#ef4444" />
            <line x1="116" y1="48" x2="80" y2="66" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            {/* Push arms */}
            <polyline points="104,54 110,75 110,95" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
            {/* Bent Legs ready to spring */}
            <polyline points="80,66 55,56 40,95" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Floor line */}
            <line x1="20" y1="96" x2="140" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );

      case 'mountain-climbers':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            {/* Floor line */}
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head */}
            <circle cx="125" cy="44" r="8" fill="#10b981" />
            {/* Straight Arms supporting weight */}
            <line x1="116" y1="52" x2="116" y2="96" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
            {/* Torso straight line */}
            <line x1="116" y1="52" x2="68" y2="64" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            {/* Left Knee driving forward */}
            <polyline points="68,64 88,72 82,90" stroke="#059669" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Right Leg extended back */}
            <polyline points="68,64 45,78 26,96" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Dynamic speed dashes */}
            <path d="M 68 84 L 56 84" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 72 90 L 60 90" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );

      case 'high-knees':
        return (
          <g>
            <ellipse cx="80" cy="112" rx="35" ry="5" fill="#f1f5f9" />
            {/* Head */}
            <circle cx="82" cy="24" r="8.5" fill="#3b82f6" />
            {/* Torso */}
            <line x1="82" y1="33" x2="80" y2="68" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
            {/* Left High Knee at 90 degrees */}
            <polyline points="80,68 60,68 60,94" stroke="#2563eb" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            {/* Right Leg standing slightly bent */}
            <polyline points="80,68 92,88 94,110" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            {/* Arms running motion */}
            <polyline points="82,42 64,48 58,35" stroke="#3b82f6" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="82,42 98,52 108,44" stroke="#3b82f6" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Energy arc */}
            <path d="M 46 64 Q 54 54 66 54" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </g>
        );

      case 'jump-rope':
        return (
          <g>
            {/* Jump Rope Arc */}
            <path d="M 45 60 Q 80 -8 115 60" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="6,2" />
            <ellipse cx="80" cy="114" rx="30" ry="4" fill="#f1f5f9" />
            {/* Person in air */}
            <circle cx="80" cy="30" r="8" fill="#ec4899" />
            <line x1="80" y1="38" x2="80" y2="70" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Arms holding handles */}
            <polyline points="80,46 62,54 50,58" stroke="#db2777" strokeWidth="5.5" strokeLinecap="round" />
            <polyline points="80,46 98,54 110,58" stroke="#db2777" strokeWidth="5.5" strokeLinecap="round" />
            {/* Bent knees jumping */}
            <polyline points="80,70 73,88 78,102" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" />
            <polyline points="80,70 87,88 84,102" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" />
          </g>
        );

      // 2. HAUT DU CORPS (UPPER BODY)
      case 'pushups-classic':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head */}
            <circle cx="126" cy="62" r="8" fill="#2563eb" />
            {/* Straight Body Line from head/shoulder to heels */}
            <line x1="118" y1="68" x2="36" y2="88" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Bent Arms (Pushup bottom/mid position) */}
            <polyline points="112,68 122,80 114,96" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            {/* Feet on floor */}
            <line x1="36" y1="88" x2="30" y2="96" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
            {/* Muscle highlight badge */}
            <path d="M 112 60 Q 118 52 124 60" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
          </g>
        );

      case 'pushups-diamond':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Diamond emblem above hands */}
            <polygon points="108,88 114,80 120,88 114,96" fill="#60a5fa" opacity="0.4" />
            {/* Head */}
            <circle cx="124" cy="60" r="8" fill="#4338ca" />
            {/* Body */}
            <line x1="116" y1="66" x2="36" y2="88" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Narrow diamond arms */}
            <polyline points="110,66 126,76 114,96" stroke="#6366f1" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="36" y1="88" x2="30" y2="96" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
          </g>
        );

      case 'dips-chair':
        return (
          <g>
            <ellipse cx="80" cy="110" rx="55" ry="5" fill="#f1f5f9" />
            {/* Chair / Bench */}
            <rect x="25" y="60" width="35" height="8" rx="2" fill="#94a3b8" />
            <line x1="30" y1="68" x2="30" y2="100" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            <line x1="55" y1="68" x2="55" y2="100" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            
            {/* Head */}
            <circle cx="70" cy="36" r="8" fill="#0284c7" />
            {/* Torso straight down */}
            <line x1="70" y1="44" x2="70" y2="80" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Arms gripping bench behind */}
            <polyline points="70,50 56,52 56,60" stroke="#0ea5e9" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            {/* Legs extended out */}
            <polyline points="70,80 95,84 125,100" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Floor */}
            <line x1="15" y1="100" x2="145" y2="100" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );

      case 'pike-pushups':
        return (
          <g>
            <ellipse cx="80" cy="110" rx="55" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Inverted V / Pike Position */}
            {/* Head near floor */}
            <circle cx="95" cy="74" r="7.5" fill="#8b5cf6" />
            {/* Hands pushing into floor */}
            <line x1="88" y1="68" x2="94" y2="96" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round" />
            {/* Torso going up to hips */}
            <line x1="88" y1="68" x2="70" y2="38" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            {/* Legs going down from hips to feet */}
            <line x1="70" y1="38" x2="40" y2="96" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            {/* Shoulder focus indicator */}
            <circle cx="88" cy="68" r="4" fill="#f59e0b" />
          </g>
        );

      case 'decline-pushups':
        return (
          <g>
            <ellipse cx="80" cy="110" rx="55" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Elevated Step / Bench on left */}
            <rect x="20" y="70" width="25" height="26" rx="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
            {/* Head lower than feet */}
            <circle cx="120" cy="72" r="7.5" fill="#3b82f6" />
            {/* Slanted Body line downwards */}
            <line x1="112" y1="76" x2="35" y2="68" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            {/* Arms on floor */}
            <line x1="112" y1="76" x2="114" y2="96" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />
          </g>
        );

      // 3. ABDOS & GAINAGE (ABS & CORE)
      case 'plank-standard':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head */}
            <circle cx="124" cy="64" r="7.5" fill="#10b981" />
            {/* Perfectly flat horizontal body line */}
            <line x1="116" y1="70" x2="32" y2="76" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Forearm 90 degree support */}
            <polyline points="112,70 112,96 126,96" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            {/* Toes planted */}
            <line x1="32" y1="76" x2="28" y2="96" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
            {/* Core activation aura */}
            <path d="M 65 65 Q 80 62 95 65" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        );

      case 'side-plank':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="55" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head */}
            <circle cx="120" cy="46" r="7.5" fill="#0d9488" />
            {/* Upper arm raised straight in sky */}
            <line x1="112" y1="52" x2="112" y2="24" stroke="#0d9488" strokeWidth="5" strokeLinecap="round" />
            {/* Diagonal torso & legs */}
            <line x1="112" y1="52" x2="38" y2="90" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Bottom elbow support */}
            <line x1="112" y1="52" x2="112" y2="96" stroke="#14b8a6" strokeWidth="6" strokeLinecap="round" />
            <line x1="38" y1="90" x2="34" y2="96" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
          </g>
        );

      case 'crunches':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head lifted */}
            <circle cx="48" cy="62" r="7.5" fill="#f59e0b" />
            {/* Hands behind ears */}
            <polyline points="48,62 42,54 48,50" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" />
            {/* Curled upper back / chest */}
            <path d="M 48 70 Q 64 80 80 90" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" fill="none" />
            {/* Bent knees planted on ground */}
            <polyline points="80,90 102,64 122,96" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Abs contraction spark */}
            <path d="M 60 76 Q 68 70 74 78" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        );

      case 'leg-raises':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head lying flat */}
            <circle cx="34" cy="88" r="7.5" fill="#6366f1" />
            {/* Flat back on floor */}
            <line x1="34" y1="92" x2="80" y2="92" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Arms at sides on floor */}
            <line x1="45" y1="94" x2="75" y2="94" stroke="#6366f1" strokeWidth="4.5" strokeLinecap="round" />
            {/* Legs raised vertical to 90 degrees */}
            <line x1="80" y1="92" x2="80" y2="34" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            {/* Movement motion arc */}
            <path d="M 115 88 Q 110 50 88 38" stroke="#6366f1" strokeWidth="2" strokeDasharray="3,2" strokeLinecap="round" fill="none" />
          </g>
        );

      case 'russian-twists':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="55" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head */}
            <circle cx="50" cy="46" r="7.5" fill="#ec4899" />
            {/* V-Sit Torso (leaning back 45 deg) */}
            <line x1="50" y1="54" x2="75" y2="88" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Bent elevated legs in air */}
            <polyline points="75,88 100,70 120,80" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Hands twisting to side holding medicine ball */}
            <circle cx="68" cy="62" r="5.5" fill="#ec4899" />
            <polyline points="54,58 68,62" stroke="#db2777" strokeWidth="4.5" strokeLinecap="round" />
            {/* Rotation arrows */}
            <path d="M 60 50 Q 75 44 85 54" stroke="#f59e0b" strokeWidth="2" fill="none" />
          </g>
        );

      case 'bicycle-crunches':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head lifted */}
            <circle cx="42" cy="66" r="7.5" fill="#8b5cf6" />
            <path d="M 42 74 Q 60 84 75 90" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" fill="none" />
            {/* Left Knee coming to right elbow */}
            <polyline points="75,90 70,64 60,60" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="42" y1="68" x2="62" y2="60" stroke="#8b5cf6" strokeWidth="4.5" strokeLinecap="round" />
            {/* Right leg extended straight in air */}
            <line x1="75" y1="90" x2="128" y2="76" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" />
          </g>
        );

      // 4. BAS DU CORPS & FESSIERS (LOWER BODY)
      case 'squats-bodyweight':
        return (
          <g>
            <ellipse cx="80" cy="112" rx="45" ry="5" fill="#f1f5f9" />
            {/* Head upright */}
            <circle cx="65" cy="38" r="8" fill="#16a34a" />
            {/* Torso angled slightly forward */}
            <line x1="65" y1="46" x2="55" y2="74" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Arms extended out for balance */}
            <line x1="65" y1="52" x2="98" y2="52" stroke="#22c55e" strokeWidth="5.5" strokeLinecap="round" />
            {/* Thighs parallel to floor (Squat depth) */}
            <polyline points="55,74 88,74 85,108" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            {/* Ground */}
            <line x1="20" y1="108" x2="140" y2="108" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Target Quad & Glute glow */}
            <path d="M 52 74 Q 72 70 88 74" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        );

      case 'lunges-walking':
        return (
          <g>
            <ellipse cx="80" cy="112" rx="55" ry="5" fill="#f1f5f9" />
            {/* Head */}
            <circle cx="75" cy="30" r="8" fill="#2563eb" />
            {/* Torso vertical */}
            <line x1="75" y1="38" x2="75" y2="68" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Hands on hips */}
            <polyline points="75,46 62,54 70,62" stroke="#3b82f6" strokeWidth="4.5" strokeLinecap="round" />
            {/* Front Leg at 90 deg angle */}
            <polyline points="75,68 105,68 105,104" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            {/* Back Leg with knee hovering near floor */}
            <polyline points="75,68 50,78 45,102" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="20" y1="104" x2="140" y2="104" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );

      case 'jump-squats':
        return (
          <g>
            <ellipse cx="80" cy="114" rx="35" ry="4" fill="#f1f5f9" />
            {/* Explosion lines from floor */}
            <path d="M 60 110 L 60 96" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 80 112 L 80 94" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 100 110 L 100 96" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            {/* Body suspended in air */}
            <circle cx="80" cy="24" r="8" fill="#ea580c" />
            <line x1="80" y1="32" x2="80" y2="64" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Arms throwing up */}
            <polyline points="80,42 60,30 52,14" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" />
            <polyline points="80,42 100,30 108,14" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" />
            {/* Legs extended downwards */}
            <polyline points="80,64 70,82 72,96" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" />
            <polyline points="80,64 90,82 88,96" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" />
          </g>
        );

      case 'wall-sit':
        return (
          <g>
            <ellipse cx="80" cy="112" rx="50" ry="5" fill="#f1f5f9" />
            {/* Wall on left */}
            <line x1="45" y1="20" x2="45" y2="108" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
            {/* Back against wall */}
            <circle cx="53" cy="38" r="7.5" fill="#0284c7" />
            <line x1="49" y1="46" x2="49" y2="74" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* 90 degree thigh and shin */}
            <line x1="49" y1="74" x2="86" y2="74" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            <line x1="86" y1="74" x2="86" y2="108" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            {/* Arms folded or on thighs */}
            <line x1="52" y1="55" x2="72" y2="68" stroke="#0284c7" strokeWidth="5" strokeLinecap="round" />
            {/* Floor */}
            <line x1="40" y1="108" x2="140" y2="108" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );

      case 'glute-bridge':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head and shoulders on floor */}
            <circle cx="34" cy="88" r="7.5" fill="#c026d3" />
            <line x1="34" y1="92" x2="48" y2="92" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Pelvis / Bridge pushed up high */}
            <line x1="48" y1="92" x2="82" y2="56" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Thighs to feet planted */}
            <line x1="82" y1="56" x2="108" y2="96" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            {/* Hands flat on floor */}
            <line x1="48" y1="94" x2="75" y2="94" stroke="#c026d3" strokeWidth="4.5" strokeLinecap="round" />
            {/* Upward arrow under hips */}
            <path d="M 82 82 L 82 66" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="82,62 78,68 86,68" fill="#f59e0b" />
          </g>
        );

      case 'calf-raises':
        return (
          <g>
            <ellipse cx="80" cy="112" rx="40" ry="5" fill="#f1f5f9" />
            {/* Head */}
            <circle cx="80" cy="24" r="8" fill="#0891b2" />
            {/* Tall straight body */}
            <line x1="80" y1="32" x2="80" y2="76" stroke="#1e293b" strokeWidth="7.5" strokeLinecap="round" />
            {/* Legs on tiptoes */}
            <line x1="77" y1="76" x2="77" y2="102" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" />
            <line x1="83" y1="76" x2="83" y2="102" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" />
            {/* Tiptoes touching floor with heels elevated */}
            <circle cx="77" cy="107" r="2.5" fill="#0891b2" />
            <circle cx="83" cy="107" r="2.5" fill="#0891b2" />
            {/* Ground */}
            <line x1="30" y1="108" x2="130" y2="108" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Upward arrows under heels */}
            <path d="M 66 102 L 66 92" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
            <polygon points="66,88 63,94 69,94" fill="#0891b2" />
          </g>
        );

      // 5. MOBILITÉ & ÉTIREMENTS (MOBILITY)
      case 'cobra-stretch':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head looking up */}
            <circle cx="118" cy="38" r="7.5" fill="#10b981" />
            {/* Upward curved spine */}
            <path d="M 112 46 Q 96 66 70 88 L 30 94" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" fill="none" />
            {/* Straight arms pushing chest up */}
            <line x1="102" y1="54" x2="102" y2="96" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
            {/* Sun / Relaxation rays */}
            <circle cx="130" cy="22" r="3" fill="#f59e0b" />
          </g>
        );

      case 'downward-dog':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="55" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head between arms */}
            <circle cx="106" cy="68" r="7" fill="#059669" />
            {/* Arms extending to floor */}
            <line x1="98" y1="62" x2="124" y2="96" stroke="#059669" strokeWidth="5.5" strokeLinecap="round" />
            {/* Inverted V Body: arms/torso to hips */}
            <line x1="98" y1="62" x2="72" y2="34" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            {/* Legs from hips to heels on floor */}
            <line x1="72" y1="34" x2="36" y2="96" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
          </g>
        );

      case 'cat-cow':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="55" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head on all fours */}
            <circle cx="120" cy="56" r="7.5" fill="#6366f1" />
            {/* Arched back */}
            <path d="M 112 62 Q 80 44 48 64" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" fill="none" />
            {/* Arms on floor */}
            <line x1="108" y1="64" x2="108" y2="96" stroke="#6366f1" strokeWidth="5.5" strokeLinecap="round" />
            {/* Knees on floor */}
            <polyline points="48,64 48,96 34,96" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'child-pose':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="60" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head down on floor */}
            <circle cx="95" cy="84" r="7" fill="#8b5cf6" />
            {/* Torso folded over thighs */}
            <path d="M 40 86 Q 48 65 75 75 L 95 86" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" fill="none" />
            {/* Arms outstretched forward on floor */}
            <line x1="88" y1="80" x2="135" y2="94" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" />
            {/* Knees tucked under body */}
            <polyline points="40,86 35,96 55,96" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'hamstring-stretch':
        return (
          <g>
            <ellipse cx="80" cy="108" rx="55" ry="5" fill="#f1f5f9" />
            <line x1="15" y1="96" x2="145" y2="96" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head bending towards toes */}
            <circle cx="85" cy="56" r="7.5" fill="#0d9488" />
            {/* Folded forward torso */}
            <path d="M 45 88 Q 65 52 80 58" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" fill="none" />
            {/* One leg straight, one bent */}
            <line x1="45" y1="88" x2="115" y2="96" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" />
            {/* Hands reaching to foot */}
            <line x1="80" y1="62" x2="112" y2="92" stroke="#0d9488" strokeWidth="4.5" strokeLinecap="round" />
          </g>
        );

      default:
        return (
          <g>
            <circle cx="80" cy="40" r="14" fill="#3b82f6" />
            <line x1="80" y1="54" x2="80" y2="90" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
            <line x1="50" y1="65" x2="110" y2="65" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />
            <line x1="80" y1="90" x2="60" y2="115" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            <line x1="80" y1="90" x2="100" y2="115" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
          </g>
        );
    }
  };

  return (
    <div
      className={`exercise-illustration-wrapper ${className}`}
      style={{
        width: size,
        height: Math.round(size * 0.75),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox="0 0 160 120"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {renderIllustration()}
      </svg>
    </div>
  );
};

export default ExerciseIllustration;
