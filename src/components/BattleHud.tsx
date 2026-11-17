import React, { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Coins,
  Crown,
  Flame,
  Gem,
  Play,
  RotateCcw,
  Shield,
  Snowflake,
  Sparkles,
  Swords,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  LORD_SKILLS,
  TOWER_DEFINITIONS,
} from '../data/gameConfig';
import {
  BattleHudState,
  CameraPreset,
  CoopChatMessage,
  SkillId,
  TowerBranch,
  TowerType,
} from '../types/game';
import { ChatPanel } from './ChatPanel';

interface BattleHudProps {
  hud: BattleHudState;
  unlockedSkills: SkillId[];
  muted: boolean;
  cameraPreset: CameraPreset;
  currentUid: string;
  isSignedIn: boolean;
  coopMessages?: CoopChatMessage[];
  coopChatError?: string | null;
  onSendCoopChat?: (text: string) => Promise<void>;
  onStartWave: () => void;
  onSelectBuildType: (type: TowerType) => void;
  onUpgradeTower: (branch?: TowerBranch.PATH_A | TowerBranch.PATH_B) => void;
  onSellTower: () => void;
  onTriggerSkill: (skillId: SkillId) => void;
  onToggleSpeed: () => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onRestartBattle: () => void;
  onExitToLobby: () => void;
}

const TOWER_ORDER: TowerType[] = [
  TowerType.ARCHER,
  TowerType.FLAME,
  TowerType.FROST,
  TowerType.TESLA,
];

function TowerGlyph({ type }: { type: TowerType }) {
  if (type === TowerType.ARCHER) return <Swords className="w-4 h-4 text-sky-400" />;
  if (type === TowerType.FLAME) return <Flame className="w-4 h-4 text-orange-400" />;
  if (type === TowerType.FROST) return <Snowflake className="w-4 h-4 text-cyan-400" />;
  return <Zap className="w-4 h-4 text-purple-400" />;
}

export const BattleHud: React.FC<BattleHudProps> = ({
  hud,
  unlockedSkills,
  muted,
  cameraPreset,
  currentUid,
  isSignedIn,
  coopMessages = [],
  coopChatError = null,
  onSendCoopChat,
  onStartWave,
  onSelectBuildType,
  onUpgradeTower,
  onSellTower,
  onTriggerSkill,
  onToggleSpeed,
  onCycleCamera,
  onToggleMute,
  onRestartBattle,
  onExitToLobby,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const cameraLabel =
    cameraPreset === CameraPreset.SECOND_PERSON
      ? '2인칭 성벽'
      : cameraPreset === CameraPreset.TACTICAL_HIGH
        ? '전술 조감'
        : '측면 시야';

  const hpPct = Math.max(0, Math.min(100, Math.round((hud.castleHp / hud.maxCastleHp) * 100)));
  const selectedTower = hud.selectedTower;
  const selectedDef = selectedTower ? TOWER_DEFINITIONS[selectedTower.type] : null;
  const isCoop = hud.gameMode === 'coop';
  const isMySelectedTower =
    !selectedTower || !isCoop || !hud.coopSide || selectedTower.side === hud.coopSide;

  const isMiniBossWave = hud.wave % 10 === 5;
  const isBigBossWave = hud.wave % 10 === 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Top Area: Battle Header + Top-Docked Boss Health Bar & Banner (never blocks center lane) */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-slate-700/70 bg-[#0c111d]/92 px-4 py-2.5 shadow-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              <span className="font-display text-sm font-bold tracking-wide text-slate-100 whitespace-nowrap">
                Wave <span className="font-mono-num text-amber-400">{hud.wave}</span>
              </span>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                · {isBigBossWave ? '빅보스 웨이브' : isMiniBossWave ? '중간보스 웨이브' : '무제한 방어'}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-700/80" />

            {/* Castle HP */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-medium text-slate-300 whitespace-nowrap">성문 내구도</span>
              <div className="h-2.5 w-28 overflow-hidden rounded-sm bg-slate-800 border border-slate-700">
                <div
                  className={`h-full transition-all duration-200 ${
                    hpPct > 50 ? 'bg-emerald-500' : hpPct > 25 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <span className="font-mono-num text-xs font-semibold text-slate-100 whitespace-nowrap">
                {hud.castleHp}/{hud.maxCastleHp}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-700/80" />

            {/* Coins & Session Crystals */}
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-1.5"
                title={isCoop ? '공용 코인 (웨이브마다 +5)' : '전투 코인 (웨이브마다 +3)'}
              >
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="font-mono-num text-sm font-bold text-amber-300">{hud.coins}</span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {isCoop ? '공용 코인' : '코인'}
                </span>
              </div>
              <div className="flex items-center gap-1.5" title="이번 전투 획득 크리스탈">
                <Gem className="h-4 w-4 text-cyan-400" />
                <span className="font-mono-num text-sm font-bold text-cyan-300">
                  +{hud.sessionCrystals}
                </span>
              </div>
            </div>

            {isCoop && hud.coopSide && (
              <>
                <div className="h-4 w-px bg-slate-700/80" />
                <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                  <Users className="h-3.5 w-3.5 text-cyan-400" />
                  <span
                    className={`font-bold ${
                      hud.coopSide === 'left' ? 'text-sky-300' : 'text-rose-300'
                    }`}
                  >
                    {hud.coopSide === 'left' ? '왼쪽 진영' : '오른쪽 진영'}
                  </span>
                  {hud.partnerName && (
                    <span className="text-slate-400 hidden sm:inline">
                      · 파트너 {hud.partnerName}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Utility Controls */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-700/70 bg-[#0c111d]/92 px-3 py-2 shadow-lg">
            <button
              type="button"
              onClick={onToggleSpeed}
              className="rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 font-mono-num text-xs font-semibold text-slate-100 hover:border-amber-500/60 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
            >
              {hud.speedMultiplier}x 배속
            </button>
            <button
              type="button"
              onClick={onCycleCamera}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-500/60 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{cameraLabel}</span>
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? '소리 켜기' : '음소거'}
              className="rounded-lg border border-slate-700 bg-slate-800/90 p-1.5 text-slate-300 hover:text-white transition-colors shrink-0"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onExitToLobby}
              className="rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-rose-500/60 hover:text-rose-300 transition-colors whitespace-nowrap shrink-0"
            >
              로비
            </button>
          </div>
        </div>

        {/* Active Boss Health Bar / Wave Notification Banner docked near top */}
        {(hud.activeBossName || hud.bannerMessage) && (
          <div className="flex flex-col items-center gap-1.5 pointer-events-none">
            {hud.activeBossName && (
              <div className="w-full max-w-sm rounded-xl border border-rose-500/50 bg-[#140c14]/92 px-3.5 py-2 shadow-xl">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-rose-300">
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    {hud.activeBossName}
                  </span>
                  <span className="font-mono-num text-rose-200">
                    {hud.activeBossHp.toLocaleString()} / {hud.activeBossMaxHp.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-900 border border-rose-900/70">
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-150"
                    style={{
                      width: `${
                        hud.activeBossMaxHp > 0
                          ? Math.max(0, Math.min(100, (hud.activeBossHp / hud.activeBossMaxHp) * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {hud.bannerMessage && (
              <div className="rounded-lg border border-amber-500/40 bg-[#0c111d]/92 px-4 py-1.5 text-xs font-medium text-amber-200 shadow-lg">
                {hud.bannerMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Area: Selected Tower Inspector + Collapsible Tactical Dock */}
      <div className="flex flex-col items-center gap-2">
        {/* Selected Tower Upgrade Tree Drawer (compact, sits just above dock) */}
        {selectedTower && selectedDef && !dockCollapsed && hud.phase !== 'game_over' && (
          <div className="pointer-events-auto w-full max-w-[820px] rounded-xl border border-slate-700/80 bg-[#0c111d]/95 p-3.5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <TowerGlyph type={selectedTower.type} />
                  <span className="text-sm font-bold text-white">{selectedDef.name}</span>
                  <span className="font-mono-num text-xs text-amber-400">
                    Lv.{selectedTower.level}
                  </span>
                  <span className="text-xs text-slate-400">
                    · 처치 <span className="font-mono-num text-slate-200">{selectedTower.kills}</span>
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-300 font-mono-num">
                  <span>공격력 {Math.round(selectedTower.damage)}</span>
                  <span>·</span>
                  <span>공속 {selectedTower.interval.toFixed(2)}s</span>
                  <span>·</span>
                  <span>사거리 {selectedTower.range.toFixed(1)}m</span>
                </div>
              </div>

              {/* Upgrade / Branch Controls */}
              {isMySelectedTower ? (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedTower.level < 3 && selectedTower.nextUpgradeCost !== null && (
                    <button
                      type="button"
                      disabled={hud.coins < selectedTower.nextUpgradeCost}
                      onClick={() => onUpgradeTower()}
                      className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        hud.coins >= selectedTower.nextUpgradeCost
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Lv.{selectedTower.level + 1} 강화 ({selectedTower.nextUpgradeCost} 코인)
                    </button>
                  )}

                  {selectedTower.level === 3 &&
                    selectedDef.branches.map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        disabled={hud.coins < branch.cost}
                        onClick={() => onUpgradeTower(branch.id)}
                        className={`rounded-lg border px-3 py-1.5 text-left transition-colors ${
                          hud.coins >= branch.cost
                            ? 'border-amber-500/60 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                            : 'border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-xs font-bold whitespace-nowrap">
                          {branch.name} ({branch.cost} 코인)
                        </div>
                        <div className="text-[11px] text-slate-300">{branch.subtitle}</div>
                      </button>
                    ))}

                  {selectedTower.level === 4 && (
                    <span className="text-xs font-semibold text-emerald-400 px-2 whitespace-nowrap">
                      최종 진화 완료 (
                      {selectedDef.branches.find((b) => b.id === selectedTower.branch)?.name})
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={onSellTower}
                    className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>회수 +{selectedTower.sellRefund}</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  파트너 진영 타워 (보기 전용)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Toggle Handle */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="flex items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700/70 bg-[#0c111d]/92 px-3 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
          >
            {dockCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span>{dockCollapsed ? '전술 컨트롤 열기' : '전술 컨트롤 접기'}</span>
            {hud.hoveredSlotLabel && (
              <span className="font-mono-num text-amber-300 ml-1">· 격자 {hud.hoveredSlotLabel}</span>
            )}
          </button>
        </div>

        {/* Unified Bottom Tactical Dock */}
        {!dockCollapsed && (
          <div className="pointer-events-auto flex w-full max-w-[940px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-[#0c111d]/95 px-4 py-3 shadow-2xl">
            {/* Tower Build Palette */}
            <div className="flex flex-wrap items-center gap-2">
              {TOWER_ORDER.map((type) => {
                const def = TOWER_DEFINITIONS[type];
                const isSelected = hud.selectedBuildType === type;
                const canAfford = hud.coins >= def.buildCost;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onSelectBuildType(type)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/15 text-white'
                        : 'border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <TowerGlyph type={type} />
                    <div>
                      <div className="text-xs font-bold leading-tight">{def.name}</div>
                      <div
                        className={`font-mono-num text-[11px] ${
                          canAfford ? 'text-amber-300' : 'text-rose-400'
                        }`}
                      >
                        {def.buildCost} 코인 · {def.tiers[0].range}m
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Castle Lord Special Attacks */}
            {unlockedSkills.length > 0 && (
              <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                {LORD_SKILLS.filter((s) => unlockedSkills.includes(s.id)).map((skill) => {
                  const cd = hud.skillCooldowns[skill.id] || 0;
                  const ready = hud.phase === 'wave_active' && cd <= 0;
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      disabled={!ready}
                      onClick={() => onTriggerSkill(skill.id)}
                      title={skill.description}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        ready
                          ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                          : 'border-slate-800 bg-slate-900/80 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{skill.name}</span>
                      {cd > 0 && (
                        <span className="font-mono-num text-[11px] text-slate-400">
                          {Math.ceil(cd)}s
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Wave Start / Status Button */}
            <div className="flex items-center gap-2 ml-auto">
              {hud.phase === 'prep' ? (
                <button
                  type="button"
                  onClick={onStartWave}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg whitespace-nowrap shrink-0"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>웨이브 {hud.wave} 시작</span>
                </button>
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 whitespace-nowrap">
                  남은 적{' '}
                  <span className="font-mono-num font-bold text-amber-400 ml-1">
                    {hud.enemiesRemaining}
                  </span>
                  <span className="text-slate-500 mx-1.5">·</span>
                  처치 <span className="font-mono-num text-slate-100">{hud.totalKills}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Co-op Real-Time Room Chat Widget */}
      {isCoop && onSendCoopChat && (
        <div className="pointer-events-none fixed right-4 top-20 z-20">
          <ChatPanel
            variant="coop"
            title="협동 실시간 채팅"
            messages={coopMessages}
            currentUid={currentUid}
            isSignedIn={isSignedIn}
            errorText={coopChatError}
            defaultOpen
            onSendMessage={onSendCoopChat}
          />
        </div>
      )}

      {/* Game Over Modal */}
      {hud.phase === 'game_over' && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0f172a] p-6 shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-rose-400">성문 함락</h2>
            <p className="mt-1 text-sm text-slate-300">
              최종 생존 기록이 리더보드와 프로필에 반영되었습니다.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-800 py-4 text-center">
              <div>
                <div className="text-xs text-slate-400">도달 웨이브</div>
                <div className="font-mono-num mt-1 text-xl font-bold text-amber-400">
                  {hud.wave}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">처치 몬스터</div>
                <div className="font-mono-num mt-1 text-xl font-bold text-slate-100">
                  {hud.totalKills}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">획득 크리스탈</div>
                <div className="font-mono-num mt-1 text-xl font-bold text-cyan-400">
                  +{hud.sessionCrystals}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onExitToLobby}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                로비로 이동
              </button>
              {!isCoop && (
                <button
                  type="button"
                  onClick={onRestartBattle}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>다시 도전</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
