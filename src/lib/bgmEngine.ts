export type BgmTrack = 'lobby' | 'battle';

interface NoteEvent {
  step: number; // 0..15 (16th-note position inside bar)
  midi: number;
  dur: number; // duration in 16th-note steps
  vel?: number; // 0..1
}

interface ChordDef {
  root: number; // bass MIDI note (octave 2)
  notes: number[]; // chord tones (octave 3/4) for lute & string pads
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Named MIDI pitch constants for crystal-clear medieval scoring
const E2 = 40;
const D2 = 38;
const C2 = 36;
const B1 = 35;
const A1 = 33;
const G2 = 43;
const A2 = 45;
const Bb2 = 46;
const B2 = 47;
const C3 = 48;
const Cs3 = 49;
const D3 = 50;
const Ds3 = 51;
const E3 = 52;
const F3 = 53;
const Fs3 = 54;
const G3 = 55;
const A3 = 57;
const Bb3 = 58;
const B3 = 59;
const C4 = 60;
const Cs4 = 61;
const D4 = 62;
const Ds4 = 63;
const E4 = 64;
const F4 = 65;
const Fs4 = 66;
const G4 = 67;
const A4 = 69;
const Bb4 = 70;
const B4 = 71;
const C5 = 72;
const Cs5 = 73;
const D5 = 74;
const Ds5 = 75;
const E5 = 76;
const F5 = 77;
const Fs5 = 78;
const G5 = 79;
const A5 = 81;
const Bb5 = 82;
const B5 = 83;
const C6 = 84;
const D6 = 86;
const E6 = 88;

// Shared Medieval Chord Voicings
const CHORD_DM: ChordDef = { root: D2, notes: [D3, A3, D4, F4] };
const CHORD_C: ChordDef = { root: C2, notes: [C3, G3, C4, E4] };
const CHORD_BB: ChordDef = { root: Bb2, notes: [Bb2, F3, Bb3, D4] };
const CHORD_A: ChordDef = { root: A1, notes: [A2, E3, A3, Cs4] };
const CHORD_F: ChordDef = { root: 41, notes: [F3, C4, F4, A4] };
const CHORD_G: ChordDef = { root: G2, notes: [G3, D4, G4, B4] };

const CHORD_EM: ChordDef = { root: E2, notes: [E3, B3, E4, G4] };
const CHORD_D_MAJ: ChordDef = { root: D2, notes: [D3, A3, D4, Fs4] };
const CHORD_C_BAT: ChordDef = { root: C3, notes: [C3, G3, C4, E4] };
const CHORD_G_BAT: ChordDef = { root: G2, notes: [G3, D4, G4, B4] };
const CHORD_AM: ChordDef = { root: A2, notes: [A2, E3, A3, C4] };
const CHORD_B_MAJ: ChordDef = { root: B1, notes: [B2, Fs3, B3, Ds4] };

// ============================================================================
// TRACK 1: LOBBY THEME — "Citadel of Dawn" (D Dorian / D Minor, 104 BPM)
// Structure (32 bars):
//   0..3   Calm Intro (Solo Lute + whisper Cello drone)
//   4..7   Theme A (Catchy Medieval Flute hook + soft frame drum)
//   8..15  Build-Up (Strings + sparkling Dulcimer + rising Timpani)
//   16..27 HIGHLIGHT (Full Royal Orchestra: Octave Strings + Flute + Brass Horns + Drums)
//   28..31 Gentle Wind-Down back to Calm Intro
// ============================================================================
const LOBBY_CHORDS: ChordDef[] = [
  // 0..3 Calm Intro
  CHORD_DM, CHORD_C, CHORD_BB, CHORD_C,
  // 4..7 Theme A
  CHORD_DM, CHORD_C, CHORD_BB, CHORD_A,
  // 8..15 Build-Up
  CHORD_DM, CHORD_F, CHORD_C, CHORD_G,
  CHORD_BB, CHORD_C, CHORD_DM, CHORD_A,
  // 16..23 Highlight Part 1
  CHORD_DM, CHORD_BB, CHORD_F, CHORD_C,
  CHORD_DM, CHORD_BB, CHORD_C, CHORD_A,
  // 24..27 Highlight Peak Encore
  CHORD_DM, CHORD_BB, CHORD_F, CHORD_C,
  // 28..31 Gentle Outro
  CHORD_BB, CHORD_C, CHORD_DM, CHORD_DM,
];

const LOBBY_MELODY: Record<number, NoteEvent[]> = {
  // Calm Intro: tiny distant flute echo in bars 2-3 only
  2: [{ step: 8, midi: F5, dur: 4, vel: 0.45 }, { step: 12, midi: E5, dur: 4, vel: 0.4 }],
  3: [{ step: 0, midi: D5, dur: 6, vel: 0.45 }, { step: 8, midi: C5, dur: 6, vel: 0.4 }],

  // Theme A (Catchy medieval hook)
  4: [
    { step: 0, midi: D5, dur: 4 },
    { step: 4, midi: F5, dur: 2 },
    { step: 6, midi: E5, dur: 2 },
    { step: 8, midi: D5, dur: 4 },
    { step: 12, midi: A4, dur: 4 },
  ],
  5: [
    { step: 0, midi: C5, dur: 4 },
    { step: 4, midi: E5, dur: 2 },
    { step: 6, midi: D5, dur: 2 },
    { step: 8, midi: C5, dur: 4 },
    { step: 12, midi: G4, dur: 4 },
  ],
  6: [
    { step: 0, midi: Bb4, dur: 4 },
    { step: 4, midi: D5, dur: 2 },
    { step: 6, midi: C5, dur: 2 },
    { step: 8, midi: Bb4, dur: 2 },
    { step: 10, midi: A4, dur: 2 },
    { step: 12, midi: G4, dur: 4 },
  ],
  7: [
    { step: 0, midi: A4, dur: 6 },
    { step: 6, midi: Cs5, dur: 2 },
    { step: 8, midi: E5, dur: 4 },
    { step: 12, midi: D5, dur: 2 },
    { step: 14, midi: Cs5, dur: 2 },
  ],

  // Build-Up (Dorian hopeful lift -> dramatic rise)
  8: [
    { step: 0, midi: D5, dur: 3 },
    { step: 3, midi: E5, dur: 1 },
    { step: 4, midi: F5, dur: 4 },
    { step: 8, midi: A5, dur: 4 },
    { step: 12, midi: G5, dur: 2 },
    { step: 14, midi: F5, dur: 2 },
  ],
  9: [
    { step: 0, midi: A5, dur: 6 },
    { step: 6, midi: G5, dur: 2 },
    { step: 8, midi: F5, dur: 4 },
    { step: 12, midi: C5, dur: 4 },
  ],
  10: [
    { step: 0, midi: G5, dur: 4 },
    { step: 4, midi: E5, dur: 2 },
    { step: 6, midi: F5, dur: 2 },
    { step: 8, midi: G5, dur: 4 },
    { step: 12, midi: E5, dur: 2 },
    { step: 14, midi: D5, dur: 2 },
  ],
  11: [
    { step: 0, midi: D5, dur: 4 },
    { step: 4, midi: B4, dur: 4 },
    { step: 8, midi: D5, dur: 4 },
    { step: 12, midi: E5, dur: 2 },
    { step: 14, midi: G5, dur: 2 },
  ],
  12: [
    { step: 0, midi: F5, dur: 4 },
    { step: 4, midi: D5, dur: 2 },
    { step: 6, midi: E5, dur: 2 },
    { step: 8, midi: F5, dur: 4 },
    { step: 12, midi: G5, dur: 4 },
  ],
  13: [
    { step: 0, midi: G5, dur: 4 },
    { step: 4, midi: E5, dur: 2 },
    { step: 6, midi: F5, dur: 2 },
    { step: 8, midi: G5, dur: 4 },
    { step: 12, midi: A5, dur: 4 },
  ],
  14: [
    { step: 0, midi: A5, dur: 6 },
    { step: 6, midi: G5, dur: 2 },
    { step: 8, midi: F5, dur: 4 },
    { step: 12, midi: E5, dur: 2 },
    { step: 14, midi: D5, dur: 2 },
  ],
  15: [
    { step: 0, midi: E5, dur: 4 },
    { step: 4, midi: Cs5, dur: 2 },
    { step: 6, midi: E5, dur: 2 },
    { step: 8, midi: A5, dur: 6 },
    { step: 14, midi: G5, dur: 2 },
  ],

  // HIGHLIGHT Part 1 (Anthemic unforgettable chorus)
  16: [
    { step: 0, midi: A5, dur: 6 },
    { step: 6, midi: G5, dur: 2 },
    { step: 8, midi: F5, dur: 2 },
    { step: 10, midi: E5, dur: 2 },
    { step: 12, midi: D5, dur: 2 },
    { step: 14, midi: F5, dur: 2 },
  ],
  17: [
    { step: 0, midi: F5, dur: 6 },
    { step: 6, midi: E5, dur: 2 },
    { step: 8, midi: D5, dur: 4 },
    { step: 12, midi: F5, dur: 2 },
    { step: 14, midi: G5, dur: 2 },
  ],
  18: [
    { step: 0, midi: A5, dur: 6 },
    { step: 6, midi: Bb5, dur: 2 },
    { step: 8, midi: A5, dur: 2 },
    { step: 10, midi: G5, dur: 2 },
    { step: 12, midi: F5, dur: 4 },
  ],
  19: [
    { step: 0, midi: G5, dur: 6 },
    { step: 6, midi: A5, dur: 2 },
    { step: 8, midi: G5, dur: 4 },
    { step: 12, midi: E5, dur: 4 },
  ],
  20: [
    { step: 0, midi: A5, dur: 6 },
    { step: 6, midi: G5, dur: 2 },
    { step: 8, midi: F5, dur: 2 },
    { step: 10, midi: G5, dur: 2 },
    { step: 12, midi: A5, dur: 4 },
  ],
  21: [
    { step: 0, midi: Bb5, dur: 6 },
    { step: 6, midi: A5, dur: 2 },
    { step: 8, midi: G5, dur: 2 },
    { step: 10, midi: F5, dur: 2 },
    { step: 12, midi: D5, dur: 4 },
  ],
  22: [
    { step: 0, midi: E5, dur: 4 },
    { step: 4, midi: G5, dur: 4 },
    { step: 8, midi: C6, dur: 4 },
    { step: 12, midi: A5, dur: 2 },
    { step: 14, midi: G5, dur: 2 },
  ],
  23: [
    { step: 0, midi: A5, dur: 6 },
    { step: 6, midi: G5, dur: 2 },
    { step: 8, midi: E5, dur: 4 },
    { step: 12, midi: Cs5, dur: 2 },
    { step: 14, midi: E5, dur: 2 },
  ],

  // HIGHLIGHT Peak Encore (Soaring octave lift)
  24: [
    { step: 0, midi: D6, dur: 6 },
    { step: 6, midi: C6, dur: 2 },
    { step: 8, midi: A5, dur: 2 },
    { step: 10, midi: G5, dur: 2 },
    { step: 12, midi: F5, dur: 2 },
    { step: 14, midi: A5, dur: 2 },
  ],
  25: [
    { step: 0, midi: Bb5, dur: 6 },
    { step: 6, midi: A5, dur: 2 },
    { step: 8, midi: F5, dur: 4 },
    { step: 12, midi: G5, dur: 2 },
    { step: 14, midi: A5, dur: 2 },
  ],
  26: [
    { step: 0, midi: C6, dur: 6 },
    { step: 6, midi: Bb5, dur: 2 },
    { step: 8, midi: A5, dur: 2 },
    { step: 10, midi: G5, dur: 2 },
    { step: 12, midi: F5, dur: 4 },
  ],
  27: [
    { step: 0, midi: G5, dur: 6 },
    { step: 6, midi: A5, dur: 2 },
    { step: 8, midi: G5, dur: 4 },
    { step: 12, midi: E5, dur: 4 },
  ],

  // Gentle Outro
  28: [{ step: 0, midi: F5, dur: 6, vel: 0.72 }, { step: 6, midi: E5, dur: 2, vel: 0.65 }, { step: 8, midi: D5, dur: 8, vel: 0.65 }],
  29: [{ step: 0, midi: E5, dur: 6, vel: 0.65 }, { step: 6, midi: D5, dur: 2, vel: 0.6 }, { step: 8, midi: C5, dur: 8, vel: 0.6 }],
  30: [{ step: 0, midi: D5, dur: 8, vel: 0.58 }, { step: 8, midi: A4, dur: 8, vel: 0.5 }],
  31: [{ step: 0, midi: D5, dur: 12, vel: 0.45 }],
};

// ============================================================================
// TRACK 2: BATTLE THEME — "Siege of Chaos" (E Minor / Harmonic Minor, 136 BPM)
// Structure (32 bars):
//   0..3   Calm Brooding Intro (Quiet Lute ostinato + low cello + distant war drum heartbeat)
//   4..7   Cavalry Build-Up (Galloping strings + marching rim + dulcimer motif)
//   8..15  Battle Theme A (Addictive syncopated medieval fiddle hook + bar 15 snare riser!)
//   16..27 EPIC HIGHLIGHT (Thundering War Drums + Royal War Horns + Soaring Octave Strings!)
//   28..31 Dramatic Resolution back to Calm Intro
// ============================================================================
const BATTLE_CHORDS: ChordDef[] = [
  // 0..3 Calm Tense Intro
  CHORD_EM, CHORD_EM, CHORD_C_BAT, CHORD_B_MAJ,
  // 4..7 Cavalry March Build-Up
  CHORD_EM, CHORD_D_MAJ, CHORD_C_BAT, CHORD_B_MAJ,
  // 8..15 Battle Theme A
  CHORD_EM, CHORD_C_BAT, CHORD_G_BAT, CHORD_D_MAJ,
  CHORD_EM, CHORD_C_BAT, CHORD_AM, CHORD_B_MAJ,
  // 16..23 Epic Highlight Part 1
  CHORD_EM, CHORD_C_BAT, CHORD_G_BAT, CHORD_D_MAJ,
  CHORD_EM, CHORD_C_BAT, CHORD_D_MAJ, CHORD_B_MAJ,
  // 24..27 Epic Highlight Peak Climax
  CHORD_EM, CHORD_C_BAT, CHORD_G_BAT, CHORD_D_MAJ,
  // 28..31 Tactical Breather / Outro
  CHORD_C_BAT, CHORD_B_MAJ, CHORD_EM, CHORD_EM,
];

const BATTLE_MELODY: Record<number, NoteEvent[]> = {
  // Calm Tense Intro (Haunting quiet flute sigh)
  1: [
    { step: 0, midi: B4, dur: 6, vel: 0.5 },
    { step: 6, midi: C5, dur: 2, vel: 0.48 },
    { step: 8, midi: B4, dur: 4, vel: 0.5 },
    { step: 12, midi: G4, dur: 4, vel: 0.45 },
  ],
  2: [
    { step: 0, midi: G4, dur: 6, vel: 0.5 },
    { step: 6, midi: A4, dur: 2, vel: 0.48 },
    { step: 8, midi: G4, dur: 4, vel: 0.48 },
    { step: 12, midi: E4, dur: 4, vel: 0.42 },
  ],
  3: [
    { step: 0, midi: Fs4, dur: 8, vel: 0.5 },
    { step: 8, midi: Ds4, dur: 4, vel: 0.46 },
    { step: 12, midi: Fs4, dur: 4, vel: 0.52 },
  ],

  // Cavalry Build-Up (Rising dulcimer + strings)
  4: [
    { step: 0, midi: E5, dur: 4 },
    { step: 4, midi: B4, dur: 2 },
    { step: 6, midi: E5, dur: 2 },
    { step: 8, midi: G5, dur: 4 },
    { step: 12, midi: Fs5, dur: 4 },
  ],
  5: [
    { step: 0, midi: Fs5, dur: 4 },
    { step: 4, midi: D5, dur: 2 },
    { step: 6, midi: Fs5, dur: 2 },
    { step: 8, midi: A5, dur: 4 },
    { step: 12, midi: G5, dur: 4 },
  ],
  6: [
    { step: 0, midi: E5, dur: 4 },
    { step: 4, midi: C5, dur: 2 },
    { step: 6, midi: E5, dur: 2 },
    { step: 8, midi: G5, dur: 4 },
    { step: 12, midi: E5, dur: 4 },
  ],
  7: [
    { step: 0, midi: Fs5, dur: 4 },
    { step: 4, midi: Ds5, dur: 2 },
    { step: 6, midi: Fs5, dur: 2 },
    { step: 8, midi: B5, dur: 6 },
    { step: 14, midi: A5, dur: 2 },
  ],

  // Battle Theme A (Addictive syncopated medieval battle hook)
  8: [
    { step: 0, midi: E5, dur: 3 },
    { step: 3, midi: G5, dur: 3 },
    { step: 6, midi: Fs5, dur: 2 },
    { step: 8, midi: E5, dur: 4 },
    { step: 12, midi: B4, dur: 2 },
    { step: 14, midi: D5, dur: 2 },
  ],
  9: [
    { step: 0, midi: C5, dur: 3 },
    { step: 3, midi: E5, dur: 3 },
    { step: 6, midi: D5, dur: 2 },
    { step: 8, midi: C5, dur: 4 },
    { step: 12, midi: G4, dur: 2 },
    { step: 14, midi: B4, dur: 2 },
  ],
  10: [
    { step: 0, midi: B4, dur: 3 },
    { step: 3, midi: D5, dur: 3 },
    { step: 6, midi: C5, dur: 2 },
    { step: 8, midi: B4, dur: 4 },
    { step: 12, midi: G5, dur: 2 },
    { step: 14, midi: Fs5, dur: 2 },
  ],
  11: [
    { step: 0, midi: Fs5, dur: 4 },
    { step: 4, midi: D5, dur: 2 },
    { step: 6, midi: E5, dur: 2 },
    { step: 8, midi: Fs5, dur: 4 },
    { step: 12, midi: A5, dur: 2 },
    { step: 14, midi: G5, dur: 2 },
  ],
  12: [
    { step: 0, midi: E5, dur: 3 },
    { step: 3, midi: G5, dur: 3 },
    { step: 6, midi: A5, dur: 2 },
    { step: 8, midi: B5, dur: 4 },
    { step: 12, midi: A5, dur: 2 },
    { step: 14, midi: G5, dur: 2 },
  ],
  13: [
    { step: 0, midi: G5, dur: 3 },
    { step: 3, midi: E5, dur: 3 },
    { step: 6, midi: Fs5, dur: 2 },
    { step: 8, midi: G5, dur: 4 },
    { step: 12, midi: E5, dur: 2 },
    { step: 14, midi: D5, dur: 2 },
  ],
  14: [
    { step: 0, midi: C5, dur: 4 },
    { step: 4, midi: E5, dur: 4 },
    { step: 8, midi: A5, dur: 4 },
    { step: 12, midi: G5, dur: 2 },
    { step: 14, midi: Fs5, dur: 2 },
  ],
  15: [
    { step: 0, midi: Fs5, dur: 2 },
    { step: 2, midi: G5, dur: 2 },
    { step: 4, midi: A5, dur: 2 },
    { step: 6, midi: B5, dur: 2 },
    { step: 8, midi: Fs5, dur: 2 },
    { step: 10, midi: A5, dur: 2 },
    { step: 12, midi: B5, dur: 4 },
  ],

  // EPIC HIGHLIGHT Part 1 (Explosive heroic battle chorus!)
  16: [
    { step: 0, midi: B5, dur: 6 },
    { step: 6, midi: A5, dur: 2 },
    { step: 8, midi: G5, dur: 2 },
    { step: 10, midi: Fs5, dur: 2 },
    { step: 12, midi: E5, dur: 2 },
    { step: 14, midi: G5, dur: 2 },
  ],
  17: [
    { step: 0, midi: G5, dur: 6 },
    { step: 6, midi: Fs5, dur: 2 },
    { step: 8, midi: E5, dur: 4 },
    { step: 12, midi: G5, dur: 2 },
    { step: 14, midi: A5, dur: 2 },
  ],
  18: [
    { step: 0, midi: B5, dur: 6 },
    { step: 6, midi: C6, dur: 2 },
    { step: 8, midi: B5, dur: 2 },
    { step: 10, midi: A5, dur: 2 },
    { step: 12, midi: G5, dur: 4 },
  ],
  19: [
    { step: 0, midi: A5, dur: 6 },
    { step: 6, midi: B5, dur: 2 },
    { step: 8, midi: A5, dur: 4 },
    { step: 12, midi: Fs5, dur: 4 },
  ],
  20: [
    { step: 0, midi: B5, dur: 6 },
    { step: 6, midi: A5, dur: 2 },
    { step: 8, midi: G5, dur: 2 },
    { step: 10, midi: A5, dur: 2 },
    { step: 12, midi: B5, dur: 4 },
  ],
  21: [
    { step: 0, midi: C6, dur: 6 },
    { step: 6, midi: B5, dur: 2 },
    { step: 8, midi: A5, dur: 2 },
    { step: 10, midi: G5, dur: 2 },
    { step: 12, midi: E5, dur: 4 },
  ],
  22: [
    { step: 0, midi: Fs5, dur: 4 },
    { step: 4, midi: A5, dur: 4 },
    { step: 8, midi: D6, dur: 4 },
    { step: 12, midi: C6, dur: 2 },
    { step: 14, midi: B5, dur: 2 },
  ],
  23: [
    { step: 0, midi: B5, dur: 6 },
    { step: 6, midi: A5, dur: 2 },
    { step: 8, midi: Fs5, dur: 4 },
    { step: 12, midi: Ds5, dur: 2 },
    { step: 14, midi: Fs5, dur: 2 },
  ],

  // EPIC HIGHLIGHT Peak Climax (Octave soaring siege anthem!)
  24: [
    { step: 0, midi: E6, dur: 6 },
    { step: 6, midi: D6, dur: 2 },
    { step: 8, midi: B5, dur: 2 },
    { step: 10, midi: A5, dur: 2 },
    { step: 12, midi: G5, dur: 2 },
    { step: 14, midi: B5, dur: 2 },
  ],
  25: [
    { step: 0, midi: C6, dur: 6 },
    { step: 6, midi: B5, dur: 2 },
    { step: 8, midi: G5, dur: 4 },
    { step: 12, midi: A5, dur: 2 },
    { step: 14, midi: B5, dur: 2 },
  ],
  26: [
    { step: 0, midi: D6, dur: 6 },
    { step: 6, midi: C6, dur: 2 },
    { step: 8, midi: B5, dur: 2 },
    { step: 10, midi: A5, dur: 2 },
    { step: 12, midi: G5, dur: 4 },
  ],
  27: [
    { step: 0, midi: A5, dur: 6 },
    { step: 6, midi: B5, dur: 2 },
    { step: 8, midi: A5, dur: 4 },
    { step: 12, midi: Fs5, dur: 4 },
  ],

  // Tactical Breather / Outro
  28: [{ step: 0, midi: G5, dur: 6, vel: 0.78 }, { step: 6, midi: Fs5, dur: 2, vel: 0.7 }, { step: 8, midi: E5, dur: 8, vel: 0.72 }],
  29: [{ step: 0, midi: Fs5, dur: 6, vel: 0.72 }, { step: 6, midi: E5, dur: 2, vel: 0.65 }, { step: 8, midi: Ds5, dur: 8, vel: 0.65 }],
  30: [{ step: 0, midi: E5, dur: 8, vel: 0.55 }, { step: 8, midi: B4, dur: 8, vel: 0.45 }],
  31: [{ step: 0, midi: E5, dur: 12, vel: 0.4 }],
};

// Arpeggio step patterns (indices into chord.notes: 0..3)
const LOBBY_ARP_CALM = [0, -1, 1, -1, 2, -1, 3, -1, 2, -1, 1, -1, 2, -1, 1, -1];
const LOBBY_ARP_FULL = [0, 2, 1, 3, 2, 3, 1, 2, 0, 2, 3, 2, 1, 3, 2, 1];
const BATTLE_ARP_CALM = [0, -1, 2, -1, 1, -1, 3, -1, 0, -1, 2, -1, 1, -1, 2, -1];
const BATTLE_ARP_GALLOP = [0, -1, 0, 1, 2, -1, 1, 2, 0, -1, 0, 1, 3, -1, 2, 1];

export class MedievalBgmEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dryBus: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private activeTrack: BgmTrack | null = null;
  private desiredTrack: BgmTrack | null = null;
  private muted = false;
  private isPlaying = false;
  private schedulerId: number | null = null;
  private switchTimerId: number | null = null;

  private currentStep = 0; // 0..(32 * 16 - 1) = 0..511
  private nextNoteTime = 0;

  private readonly totalBars = 32;
  private readonly stepsPerBar = 16;
  private readonly scheduleAheadSec = 0.14;
  private readonly lookaheadMs = 55;
  private readonly targetVolume = 0.56;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = (): void => {
    if (!this.ctx || !this.isPlaying) return;
    if (document.hidden) {
      this.stopScheduler();
    } else if (!this.muted && this.activeTrack) {
      this.nextNoteTime = this.ctx.currentTime + 0.08;
      this.startScheduler();
    }
  };

  private initGraph(ctx: AudioContext): void {
    if (this.ctx === ctx && this.masterGain) return;
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(3.2, ctx.currentTime);
    compressor.attack.setValueAtTime(0.012, ctx.currentTime);
    compressor.release.setValueAtTime(0.18, ctx.currentTime);

    const warmthEq = ctx.createBiquadFilter();
    warmthEq.type = 'lowshelf';
    warmthEq.frequency.setValueAtTime(180, ctx.currentTime);
    warmthEq.gain.setValueAtTime(2.5, ctx.currentTime);

    const master = ctx.createGain();
    master.gain.setValueAtTime(this.muted ? 0 : this.targetVolume, ctx.currentTime);

    const dry = ctx.createGain();
    dry.gain.setValueAtTime(0.86, ctx.currentTime);

    const revSend = ctx.createGain();
    revSend.gain.setValueAtTime(0.36, ctx.currentTime);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.createCastleReverbIR(ctx, 2.1);

    const revFilter = ctx.createBiquadFilter();
    revFilter.type = 'lowpass';
    revFilter.frequency.setValueAtTime(3200, ctx.currentTime);

    dry.connect(warmthEq);
    revSend.connect(reverb);
    reverb.connect(revFilter);
    revFilter.connect(warmthEq);
    warmthEq.connect(compressor);
    compressor.connect(master);
    master.connect(ctx.destination);

    this.masterGain = master;
    this.dryBus = dry;
    this.reverbSend = revSend;
    this.noiseBuffer = this.createNoiseBuffer(ctx, 1.5);
  }

  private createCastleReverbIR(ctx: AudioContext, durationSec: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * durationSec);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, 2.8);
        const white = Math.random() * 2 - 1;
        // One-pole lowpass for warm stone-hall damping
        lp = lp * 0.72 + white * 0.28;
        data[i] = lp * env;
      }
    }
    return impulse;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.targetVolume, now, 0.06);
    }
    if (muted) {
      this.stopScheduler();
    } else if (this.ctx && this.activeTrack && this.isPlaying) {
      this.nextNoteTime = this.ctx.currentTime + 0.08;
      this.startScheduler();
    }
  }

  public startOrSwitchTrack(ctx: AudioContext, track: BgmTrack): void {
    this.initGraph(ctx);
    this.desiredTrack = track;

    if (this.activeTrack === track && this.isPlaying) {
      if (!this.muted && this.schedulerId === null) {
        this.nextNoteTime = ctx.currentTime + 0.08;
        this.startScheduler();
      }
      return;
    }

    if (this.switchTimerId !== null) {
      window.clearTimeout(this.switchTimerId);
      this.switchTimerId = null;
    }

    // If another track is currently playing, fade out gracefully before entering the new track's calm intro
    if (this.isPlaying && this.activeTrack && this.activeTrack !== track && this.masterGain) {
      const now = ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.14);
      this.stopScheduler();

      this.switchTimerId = window.setTimeout(() => {
        this.switchTimerId = null;
        if (this.desiredTrack !== track || !this.ctx || !this.masterGain) return;
        this.beginTrackImmediately(this.ctx, track);
      }, 460);
      return;
    }

    this.beginTrackImmediately(ctx, track);
  }

  public fadeOut(): void {
    this.desiredTrack = null;
    if (this.switchTimerId !== null) {
      window.clearTimeout(this.switchTimerId);
      this.switchTimerId = null;
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.15);
    }
    this.stopScheduler();
    this.isPlaying = false;
    this.activeTrack = null;
  }

  private beginTrackImmediately(ctx: AudioContext, track: BgmTrack): void {
    this.activeTrack = track;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.08;

    if (this.masterGain) {
      const now = ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      if (this.muted) {
        this.masterGain.gain.setValueAtTime(0, now);
      } else {
        this.masterGain.gain.setValueAtTime(0.001, now);
        this.masterGain.gain.linearRampToValueAtTime(this.targetVolume, now + 0.45);
      }
    }

    if (!this.muted) {
      this.startScheduler();
    }
  }

  private startScheduler(): void {
    if (this.schedulerId !== null) return;
    this.schedulerId = window.setInterval(this.scheduleTick, this.lookaheadMs);
  }

  private stopScheduler(): void {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private getStepDurationSec(): number {
    const bpm = this.activeTrack === 'battle' ? 136 : 104;
    return 60 / bpm / 4; // 16th-note step duration
  }

  private scheduleTick = (): void => {
    if (!this.ctx || !this.isPlaying || !this.activeTrack || this.muted) return;
    if (this.ctx.state !== 'running') return;

    const stepDur = this.getStepDurationSec();
    const totalSteps = this.totalBars * this.stepsPerBar;

    // Catch up cleanly if browser throttled timers
    if (this.nextNoteTime < this.ctx.currentTime - 0.35) {
      this.nextNoteTime = this.ctx.currentTime + 0.06;
    }

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadSec) {
      const bar = Math.floor(this.currentStep / this.stepsPerBar);
      const stepInBar = this.currentStep % this.stepsPerBar;

      if (this.activeTrack === 'lobby') {
        this.scheduleLobbyStep(bar, stepInBar, this.nextNoteTime, stepDur);
      } else {
        this.scheduleBattleStep(bar, stepInBar, this.nextNoteTime, stepDur);
      }

      this.nextNoteTime += stepDur;
      this.currentStep = (this.currentStep + 1) % totalSteps;
    }
  };

  // ==========================================================================
  // LOBBY ARRANGEMENT: Calm Intro -> Theme A -> Build-Up -> Highlight -> Outro
  // ==========================================================================
  private scheduleLobbyStep(bar: number, step: number, time: number, stepDur: number): void {
    const chord = LOBBY_CHORDS[bar];
    const isIntro = bar < 4;
    const isThemeA = bar >= 4 && bar < 8;
    const isBuild = bar >= 8 && bar < 16;
    const isHighlight = bar >= 16 && bar < 28;
    const isPeak = bar >= 24 && bar < 28;
    const isOutro = bar >= 28;

    // 1. Medieval Lute Arpeggio (signature constant heartbeat throughout the castle!)
    const arpPattern = isIntro || isOutro ? LOBBY_ARP_CALM : LOBBY_ARP_FULL;
    const arpIdx = arpPattern[step];
    if (arpIdx >= 0) {
      const note = chord.notes[arpIdx] + (isHighlight && step % 4 === 3 ? 12 : 0);
      const vel = isIntro ? 0.24 : isOutro ? 0.22 : isHighlight ? 0.27 : 0.24;
      this.playLute(note, time, stepDur * 3.6, vel);
    }

    // 2. Warm Bowed Cello Drone / Bass Root
    if (step === 0) {
      const bassDur = stepDur * 15.6;
      const bassVel = isIntro ? 0.17 : isOutro ? 0.16 : isHighlight ? 0.28 : 0.22;
      this.playString(chord.root, time, bassDur, bassVel, isHighlight ? 1450 : 880);
      if (isBuild || isHighlight) {
        // Rich mid-register string pad chord
        this.playString(chord.notes[1], time, bassDur, isHighlight ? 0.14 : 0.09, isHighlight ? 1900 : 1250);
        this.playString(chord.notes[3], time, bassDur, isHighlight ? 0.12 : 0.08, isHighlight ? 2100 : 1350);
      }
    }

    // 3. Sparkling Hammered Dulcimer counter-arpeggio in Build-Up & Highlight
    if ((isBuild || isHighlight) && step % 2 === 0) {
      const dulcIdx = (step / 2) % chord.notes.length;
      const dulcMidi = chord.notes[dulcIdx] + 12;
      this.playDulcimer(dulcMidi, time, stepDur * 2.2, isHighlight ? 0.16 : 0.11);
    }

    // 4. Catchy Lead Melody (Flute solo -> Flute+Strings -> Soaring Octave Strings + Flute)
    const barMelody = LOBBY_MELODY[bar];
    if (barMelody) {
      for (const ev of barMelody) {
        if (ev.step === step) {
          const durSec = ev.dur * stepDur * 0.96;
          const v = ev.vel ?? 1;
          if (isIntro || isOutro) {
            this.playFlute(ev.midi, time, durSec, 0.24 * v);
          } else if (isThemeA) {
            this.playFlute(ev.midi, time, durSec, 0.28 * v);
          } else if (isBuild) {
            this.playFlute(ev.midi, time, durSec, 0.24 * v);
            this.playString(ev.midi, time, durSec, 0.17 * v, 2100);
          } else if (isHighlight) {
            // Heroic doubled octave melody for maximum goosebumps!
            this.playString(ev.midi, time, durSec, 0.24 * v, 2600);
            this.playFlute(ev.midi, time, durSec, 0.2 * v);
            this.playString(ev.midi - 12, time, durSec, 0.14 * v, 1800);
          }
        }
      }
    }

    // 5. Royal Brass Horns in Highlight!
    if (isHighlight) {
      if (step === 0) {
        this.playHorn(chord.root + 12, time, stepDur * 7.5, isPeak ? 0.24 : 0.2);
      }
      if (step === 8) {
        // Fifth / harmony horn answer
        this.playHorn(chord.notes[1], time, stepDur * 7.2, isPeak ? 0.21 : 0.17);
      }
      if (isPeak && step === 12) {
        this.playHorn(chord.notes[2], time, stepDur * 3.8, 0.19);
      }
    }

    // 6. Medieval Percussion (Frame drum / Timpani / Tambourine)
    if (isThemeA) {
      if (step === 0) this.playWarDrum(chord.root, time, 0.22);
      if (step === 8) this.playWarDrum(chord.root + 7, time, 0.14);
      if (step === 12) this.playPerc(time, 'shaker', 0.08);
    } else if (isBuild) {
      if (step === 0 || step === 10) this.playWarDrum(chord.root, time, 0.26);
      if (step === 6 || step === 14) this.playWarDrum(chord.root + 7, time, 0.18);
      if (step === 4 || step === 12) this.playPerc(time, 'rim', 0.11);
      if (step % 4 === 2) this.playPerc(time, 'shaker', 0.09);
      // Bar 15 cinematic timpani swell right before Highlight!
      if (bar === 15 && step >= 8 && step % 2 === 0) {
        const swell = 0.2 + ((step - 8) / 8) * 0.28;
        this.playWarDrum(A1 + 12, time, swell);
      }
    } else if (isHighlight) {
      if (step === 0 || step === 6 || step === 10) {
        this.playWarDrum(chord.root, time, isPeak ? 0.38 : 0.33);
      }
      if (step === 4 || step === 12) {
        this.playPerc(time, 'snare', isPeak ? 0.17 : 0.14);
      }
      if (step % 2 === 0) {
        this.playPerc(time, 'shaker', step % 4 === 2 ? 0.12 : 0.07);
      }
      if (isPeak && (step === 14 || step === 15)) {
        this.playWarDrum(chord.root + 7, time, 0.24);
      }
    } else if (isOutro && bar === 28 && step === 0) {
      this.playWarDrum(chord.root, time, 0.24);
    }
  }

  // ==========================================================================
  // BATTLE ARRANGEMENT: Tense Calm Intro -> Cavalry Gallop -> Theme A -> EPIC CLIMAX
  // ==========================================================================
  private scheduleBattleStep(bar: number, step: number, time: number, stepDur: number): void {
    const chord = BATTLE_CHORDS[bar];
    const isIntro = bar < 4;
    const isBuild = bar >= 4 && bar < 8;
    const isThemeA = bar >= 8 && bar < 16;
    const isHighlight = bar >= 16 && bar < 28;
    const isPeak = bar >= 24 && bar < 28;
    const isOutro = bar >= 28;

    // 1. Driving Lute / Ostinato Pattern (Calm pulse -> Galloping Siege Rhythm!)
    const arpPattern = isIntro || isOutro ? BATTLE_ARP_CALM : BATTLE_ARP_GALLOP;
    const arpIdx = arpPattern[step];
    if (arpIdx >= 0) {
      const note = chord.notes[arpIdx];
      const vel = isIntro ? 0.22 : isOutro ? 0.2 : isHighlight ? 0.29 : 0.26;
      this.playLute(note, time, stepDur * (isIntro ? 3.2 : 2.1), vel);
    }

    // 2. Low Galloping Battle Strings / Cello Bass
    if (isIntro || isOutro) {
      if (step === 0) {
        this.playString(chord.root, time, stepDur * 15.5, 0.2, 760);
      }
    } else {
      // Classic addictive medieval cavalry gallop bass (1 - - & 2 - - & 3 - - & 4 - - &)
      const isGallopHit =
        step === 0 || step === 2 || step === 3 ||
        step === 4 || step === 6 || step === 7 ||
        step === 8 || step === 10 || step === 11 ||
        step === 12 || step === 14 || step === 15;
      if (isGallopHit) {
        const accent = step % 4 === 0 ? 1.0 : 0.68;
        const bassNote = step === 14 || step === 15 ? chord.root + 7 : chord.root;
        this.playString(
          bassNote,
          time,
          stepDur * (step % 4 === 0 ? 1.7 : 0.95),
          (isHighlight ? 0.26 : 0.21) * accent,
          isHighlight ? 1550 : 1100,
        );
      }
      // Lush orchestral harmony pad in Theme A & Highlight
      if (step === 0 && (isThemeA || isHighlight)) {
        this.playString(chord.notes[1], time, stepDur * 15.2, isHighlight ? 0.14 : 0.09, 2000);
        this.playString(chord.notes[3], time, stepDur * 15.2, isHighlight ? 0.13 : 0.08, 2200);
      }
    }

    // 3. Hammered Dulcimer driving 8th-note medieval sparkle
    if ((isBuild || isThemeA || isHighlight) && step % 2 === 0) {
      const dIdx = (step / 2) % chord.notes.length;
      this.playDulcimer(
        chord.notes[dIdx] + 12,
        time,
        stepDur * 1.9,
        isHighlight ? 0.17 : isThemeA ? 0.13 : 0.1,
      );
    }

    // 4. Lead Melody (Haunting Flute -> Dulcimer -> Fiddle Strings -> Soaring Octave Orchestra!)
    const barMelody = BATTLE_MELODY[bar];
    if (barMelody) {
      for (const ev of barMelody) {
        if (ev.step === step) {
          const durSec = ev.dur * stepDur * 0.94;
          const v = ev.vel ?? 1;
          if (isIntro || isOutro) {
            this.playFlute(ev.midi, time, durSec, 0.25 * v);
          } else if (isBuild) {
            this.playDulcimer(ev.midi, time, durSec, 0.24 * v);
            this.playString(ev.midi - 12, time, durSec, 0.16 * v, 1900);
          } else if (isThemeA) {
            this.playString(ev.midi, time, durSec, 0.24 * v, 2400);
            this.playDulcimer(ev.midi, time, durSec, 0.17 * v);
          } else if (isHighlight) {
            // Massive octave heroic siege lead!
            this.playString(ev.midi, time, durSec, 0.26 * v, 2900);
            this.playFlute(ev.midi, time, durSec, 0.19 * v);
            this.playString(ev.midi - 12, time, durSec, 0.16 * v, 2000);
          }
        }
      }
    }

    // 5. Triumphant War Horns (Build-up warning call -> Full Highlight Brass Anthem!)
    if (bar === 7 && step === 8) {
      this.playHorn(B2 + 12, time, stepDur * 7.5, 0.2);
    } else if (bar === 15 && step === 0) {
      this.playHorn(B2 + 12, time, stepDur * 15, 0.24);
    } else if (isHighlight) {
      if (step === 0) {
        this.playHorn(chord.root + 12, time, stepDur * 7.2, isPeak ? 0.27 : 0.22);
      }
      if (step === 8) {
        this.playHorn(chord.notes[1], time, stepDur * 5.5, isPeak ? 0.23 : 0.19);
      }
      if (step === 14) {
        // Punchy brass pick-up stab!
        this.playHorn(chord.notes[2], time, stepDur * 2.0, 0.21);
      }
    } else if (bar === 28 && step === 0) {
      this.playHorn(chord.root + 12, time, stepDur * 14, 0.18);
    }

    // 6. War Drums & Marching Snare Percussion
    if (isIntro) {
      // Calm ominous heartbeat war drum
      if (step === 0) this.playWarDrum(chord.root, time, 0.25);
      if (step === 3 && bar >= 2) this.playWarDrum(chord.root, time, 0.15);
    } else if (isBuild) {
      if (step === 0 || step === 8) this.playWarDrum(chord.root, time, 0.3);
      if (step === 6 || step === 14) this.playWarDrum(chord.root + 7, time, 0.22);
      if (step === 4 || step === 12) this.playPerc(time, 'rim', 0.15);
      if (bar === 7 && step >= 12) this.playPerc(time, 'snare', 0.16 + (step - 12) * 0.02);
    } else if (isThemeA) {
      if (step === 0 || step === 6 || step === 10) this.playWarDrum(chord.root, time, 0.34);
      if (step === 4 || step === 12) this.playPerc(time, 'snare', 0.17);
      if (step % 2 === 0) this.playPerc(time, 'shaker', 0.08);
      // Bar 15 explosive marching snare + timpani roll into the Highlight!
      if (bar === 15) {
        const ramp = step / 15;
        if (step % 2 === 0 || step >= 10) {
          this.playPerc(time, 'snare', 0.12 + ramp * 0.16);
        }
        if (step % 4 === 0 || step >= 12) {
          this.playWarDrum(B1 + 12, time, 0.22 + ramp * 0.24);
        }
      }
    } else if (isHighlight) {
      // Full war-drum thunder + driving battle snare!
      if (step === 0 || step === 3 || step === 6 || step === 10) {
        this.playWarDrum(chord.root, time, isPeak ? 0.42 : 0.36);
      }
      if (step === 4 || step === 12) {
        this.playPerc(time, 'snare', isPeak ? 0.22 : 0.19);
      }
      if (step === 14 || step === 15) {
        this.playPerc(time, 'snare', 0.14);
      }
      if (step % 2 === 0) {
        this.playPerc(time, 'shaker', step % 4 === 2 ? 0.13 : 0.08);
      }
    } else if (isOutro) {
      if (bar <= 29 && step === 0) {
        this.playWarDrum(chord.root, time, bar === 28 ? 0.32 : 0.22);
      }
    }
  }

  // ==========================================================================
  // PROCEDURAL MEDIEVAL INSTRUMENT VOICES
  // ==========================================================================

  private connectToMix(node: AudioNode, wetAmount: number): void {
    if (!this.dryBus || !this.reverbSend || !this.ctx) return;
    node.connect(this.dryBus);
    if (wetAmount > 0) {
      const send = this.ctx.createGain();
      send.gain.setValueAtTime(wetAmount, this.ctx.currentTime);
      node.connect(send);
      send.connect(this.reverbSend);
    }
  }

  private playLute(midi: number, time: number, dur: number, vel: number): void {
    if (!this.ctx || !this.dryBus) return;
    const freq = midiToFreq(midi);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 2, time);

    const mix2 = this.ctx.createGain();
    mix2.gain.setValueAtTime(0.22, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(1.4, time);
    filter.frequency.setValueAtTime(Math.min(4200, freq * 6.5), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(480, freq * 1.8), time + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vel, time + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    osc1.connect(filter);
    osc2.connect(mix2);
    mix2.connect(filter);
    filter.connect(gain);
    this.connectToMix(gain, 0.45);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.04);
    osc2.stop(time + dur + 0.04);
  }

  private playFlute(midi: number, time: number, dur: number, vel: number): void {
    if (!this.ctx || !this.dryBus) return;
    const freq = midiToFreq(midi);

    const osc = this.ctx.createOscillator();
    const harm = this.ctx.createOscillator();
    osc.type = 'sine';
    harm.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    harm.frequency.setValueAtTime(freq * 2, time);

    // Subtle bardic vibrato
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(5.1, time);
    lfoGain.gain.setValueAtTime(0.0001, time);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.008, time + Math.min(0.22, dur * 0.5));
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.14, time);

    const gain = this.ctx.createGain();
    const attack = Math.min(0.065, dur * 0.35);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vel, time + attack);
    gain.gain.setValueAtTime(vel * 0.9, time + Math.max(attack, dur - 0.06));
    gain.gain.exponentialRampToValueAtTime(0.0008, time + dur + 0.06);

    osc.connect(gain);
    harm.connect(harmGain);
    harmGain.connect(gain);
    this.connectToMix(gain, 0.55);

    osc.start(time);
    harm.start(time);
    lfo.start(time);
    osc.stop(time + dur + 0.08);
    harm.stop(time + dur + 0.08);
    lfo.stop(time + dur + 0.08);

    // Gentle wooden-flute breath chiff transient
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(Math.min(4800, freq * 2.2), time);
      bp.Q.setValueAtTime(3.0, time);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.0001, time);
      nGain.gain.linearRampToValueAtTime(vel * 0.14, time + 0.015);
      nGain.gain.exponentialRampToValueAtTime(0.0005, time + 0.055);
      noise.connect(bp);
      bp.connect(nGain);
      this.connectToMix(nGain, 0.3);
      noise.start(time);
      noise.stop(time + 0.065);
    }
  }

  private playString(
    midi: number,
    time: number,
    dur: number,
    vel: number,
    cutoffHz: number,
  ): void {
    if (!this.ctx || !this.dryBus) return;
    const freq = midiToFreq(midi);

    // Pair of softly detuned sawtooth oscillators for lush orchestral bowed strings
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.setValueAtTime(freq, time);
    oscB.frequency.setValueAtTime(freq, time);
    oscA.detune.setValueAtTime(-6.5, time);
    oscB.detune.setValueAtTime(6.5, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(0.8, time);
    filter.frequency.setValueAtTime(cutoffHz * 0.65, time);
    filter.frequency.linearRampToValueAtTime(cutoffHz, time + Math.min(0.18, dur * 0.45));

    const gain = this.ctx.createGain();
    const attack = Math.min(0.11, dur * 0.35);
    const release = Math.min(0.16, dur * 0.3);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vel * 0.55, time + attack);
    gain.gain.setValueAtTime(vel * 0.5, time + Math.max(attack, dur - release));
    gain.gain.exponentialRampToValueAtTime(0.0008, time + dur + 0.08);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    this.connectToMix(gain, 0.5);

    oscA.start(time);
    oscB.start(time);
    oscA.stop(time + dur + 0.1);
    oscB.stop(time + dur + 0.1);
  }

  private playHorn(midi: number, time: number, dur: number, vel: number): void {
    if (!this.ctx || !this.dryBus) return;
    const freq = midiToFreq(midi);

    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'square';
    oscA.frequency.setValueAtTime(freq, time);
    oscB.frequency.setValueAtTime(freq * 0.5, time);
    oscA.detune.setValueAtTime(4, time);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.28, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(1.8, time);
    filter.frequency.setValueAtTime(340, time);
    filter.frequency.exponentialRampToValueAtTime(1750, time + Math.min(0.14, dur * 0.4));
    filter.frequency.exponentialRampToValueAtTime(880, time + dur);

    const gain = this.ctx.createGain();
    const attack = Math.min(0.09, dur * 0.35);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vel * 0.6, time + attack);
    gain.gain.setValueAtTime(vel * 0.52, time + Math.max(attack, dur - 0.08));
    gain.gain.exponentialRampToValueAtTime(0.0008, time + dur + 0.1);

    oscA.connect(filter);
    oscB.connect(subGain);
    subGain.connect(filter);
    filter.connect(gain);
    this.connectToMix(gain, 0.62);

    oscA.start(time);
    oscB.start(time);
    oscA.stop(time + dur + 0.12);
    oscB.stop(time + dur + 0.12);
  }

  private playDulcimer(midi: number, time: number, dur: number, vel: number): void {
    if (!this.ctx || !this.dryBus) return;
    const freq = midiToFreq(midi);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const over = this.ctx.createOscillator();
    over.type = 'sine';
    over.frequency.setValueAtTime(freq * 3, time);

    const overGain = this.ctx.createGain();
    overGain.gain.setValueAtTime(0.18, time);
    overGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vel, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + Math.min(0.55, dur));

    osc.connect(gain);
    over.connect(overGain);
    overGain.connect(gain);
    this.connectToMix(gain, 0.42);

    osc.start(time);
    over.start(time);
    osc.stop(time + Math.min(0.6, dur + 0.04));
    over.stop(time + 0.12);
  }

  private playWarDrum(midi: number, time: number, vel: number): void {
    if (!this.ctx || !this.dryBus) return;
    const baseFreq = Math.max(46, Math.min(110, midiToFreq(midi)));

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.85, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.09);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vel, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.42);

    osc.connect(gain);
    this.connectToMix(gain, 0.35);
    osc.start(time);
    osc.stop(time + 0.45);

    // Drumhead slap impact
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(520, time);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(vel * 0.32, time);
      nGain.gain.exponentialRampToValueAtTime(0.0008, time + 0.08);
      noise.connect(lp);
      lp.connect(nGain);
      this.connectToMix(nGain, 0.25);
      noise.start(time);
      noise.stop(time + 0.09);
    }
  }

  private playPerc(time: number, kind: 'snare' | 'rim' | 'shaker', vel: number): void {
    if (!this.ctx || !this.dryBus || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (kind === 'snare') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1750, time);
      filter.Q.setValueAtTime(0.9, time);
      gain.gain.setValueAtTime(vel, time);
      gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.13);
      noise.connect(filter);
      filter.connect(gain);
      this.connectToMix(gain, 0.32);
      noise.start(time);
      noise.stop(time + 0.14);
    } else if (kind === 'rim') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, time);
      filter.Q.setValueAtTime(2.6, time);
      gain.gain.setValueAtTime(vel, time);
      gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.055);
      noise.connect(filter);
      filter.connect(gain);
      this.connectToMix(gain, 0.22);
      noise.start(time);
      noise.stop(time + 0.065);
    } else {
      // Medieval tambourine / shaker shimmer
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5800, time);
      gain.gain.setValueAtTime(vel * 0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.06);
      noise.connect(filter);
      filter.connect(gain);
      this.connectToMix(gain, 0.2);
      noise.start(time);
      noise.stop(time + 0.07);
    }
  }
}
