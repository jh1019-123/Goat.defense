import React, { useEffect, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Crown,
  Flame,
  Gem,
  LogIn,
  LogOut,
  Play,
  Shield,
  Snowflake,
  Sparkles,
  Swords,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  LORD_SKILLS,
  TOWER_DEFINITIONS,
  TOWER_SKINS,
} from '../data/gameConfig';
import {
  LeaderboardRecord,
  PlayerSaveData,
  SkillId,
  TowerType,
} from '../types/game';

export type LobbyTab = 'home' | 'shop' | 'leaderboard';

interface LobbyOverlayProps {
  saveData: PlayerSaveData;
  isSignedIn: boolean;
  authLoading: boolean;
  leaderboard: LeaderboardRecord[];
  leaderboardError: string | null;
  supabaseSqlText: string;
  onStartBattle: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onBuySkin: (skinId: string, price: number) => void;
  onEquipSkin: (towerType: TowerType, skinId: string | undefined) => void;
  onBuySkill: (skillId: SkillId, cost: number) => void;
}

export const LobbyOverlay: React.FC<LobbyOverlayProps> = ({
  saveData,
  isSignedIn,
  authLoading,
  leaderboard,
  leaderboardError,
  supabaseSqlText,
  onStartBattle,
  onSignIn,
  onSignOut,
  onBuySkin,
  onEquipSkin,
  onBuySkill,
}) => {
  const [activeTab, setActiveTab] = useState<LobbyTab>('home');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (!copiedSql) return;
    const t = setTimeout(() => setCopiedSql(false), 1800);
    return () => clearTimeout(t);
  }, [copiedSql]);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(supabaseSqlText);
      setCopiedSql(true);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* 3-Zone Top Bar Contract */}
      <header className="pointer-events-auto flex items-center justify-between gap-8 border-b border-slate-800/80 bg-[#0b0f17]/90 px-6 py-4">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="font-display text-xl font-bold tracking-wide text-amber-400 whitespace-nowrap shrink-0"
        >
          Bastion Siege 3D
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'home'
                ? 'border-b-2 border-amber-400 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            전장 출격
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'shop'
                ? 'border-b-2 border-amber-400 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            크리스탈 상점
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'leaderboard'
                ? 'border-b-2 border-amber-400 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            실시간 리더보드
          </button>
        </nav>

        {/* Zone 3: Single Primary Action (Crystal Wallet + Auth) */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300 font-mono-num whitespace-nowrap">
            <Gem className="h-4 w-4 text-cyan-400" />
            <span>{saveData.crystals.toLocaleString()}</span>
          </div>

          {isSignedIn ? (
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 transition-colors whitespace-nowrap shrink-0"
            >
              <span className="max-w-[120px] truncate">{saveData.displayName}</span>
              <LogOut className="h-3.5 w-3.5 text-slate-400" />
            </button>
          ) : (
            <button
              type="button"
              disabled={authLoading}
              onClick={onSignIn}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{authLoading ? '연결 중...' : 'Google 로그인'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body depending on activeTab */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        {activeTab === 'home' && (
          <div className="mx-auto flex h-full max-w-6xl items-end md:items-center">
            <section className="pointer-events-auto w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0b0f17]/92 p-7 shadow-2xl">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                <span>2인칭 성벽 시점</span>
                <span aria-hidden="true">·</span>
                <span>격자 좌표 배치</span>
                <span aria-hidden="true">·</span>
                <span>무제한 웨이브</span>
              </div>

              <h1 className="font-display mt-3 text-3xl font-bold leading-tight text-white [text-wrap:balance] md:text-4xl">
                성문을 수호하고 끝없는 웨이브를 돌파하세요
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                중앙 통로 양옆의 좌표 격자 위에 아처, 플레임, 프로스트, 라이트닝 타워를 전략적으로 배치하세요. 매 웨이브마다 3코인과 크리스탈이 지급되며, 5웨이브마다 중간보스, 10웨이브마다 빅보스가 등장합니다.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-4 border-y border-slate-800 py-4">
                <div>
                  <div className="text-xs text-slate-400">최고 웨이브</div>
                  <div className="font-mono-num mt-1 text-xl font-bold text-amber-400">
                    {saveData.bestWave > 0 ? `${saveData.bestWave} W` : '기록 없음'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">보유 크리스탈</div>
                  <div className="font-mono-num mt-1 text-xl font-bold text-cyan-300">
                    {saveData.crystals}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">성주 특수공격</div>
                  <div className="font-mono-num mt-1 text-xl font-bold text-slate-100">
                    {saveData.unlockedSkills.length} / {LORD_SKILLS.length}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onStartBattle}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg whitespace-nowrap shrink-0"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>전투 시작</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('shop')}
                  className="rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-cyan-500/60 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
                >
                  상점 열기
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('leaderboard')}
                  className="rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-amber-500/60 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
                >
                  리더보드
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="pointer-events-auto mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-[#0b0f17]/95 p-6 md:p-8 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">크리스탈 상점</h2>
                <p className="mt-1 text-sm text-slate-400">
                  웨이브 클리어로 모은 크리스탈로 타워 스킨(30 크리스탈)과 성주 특수공격을 해금하세요.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-mono-num text-base font-bold text-cyan-300">
                <Gem className="h-4 w-4 text-cyan-400" />
                <span>{saveData.crystals.toLocaleString()} 크리스탈</span>
              </div>
            </div>

            {/* Section 1: Tower Skins (30 Crystals each) */}
            <div className="mt-7">
              <h3 className="text-base font-bold text-amber-300">타워 외형 스킨 (각 30 크리스탈)</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TOWER_SKINS.map((skin) => {
                  const owned = saveData.unlockedSkins.includes(skin.id);
                  const equipped = saveData.equippedSkins[skin.towerType] === skin.id;
                  const canBuy = saveData.crystals >= skin.price;
                  const towerName = TOWER_DEFINITIONS[skin.towerType].name;

                  return (
                    <div
                      key={skin.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/75 p-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-400">{towerName}</span>
                          <span
                            className="h-3.5 w-3.5 rounded-sm border border-white/20"
                            style={{ backgroundColor: skin.previewHex }}
                          />
                        </div>
                        <div className="mt-1.5 text-sm font-bold text-white">{skin.name}</div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          {skin.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        {owned ? (
                          <button
                            type="button"
                            onClick={() =>
                              onEquipSkin(skin.towerType, equipped ? undefined : skin.id)
                            }
                            className={`w-full rounded-lg py-2 text-xs font-semibold transition-colors ${
                              equipped
                                ? 'border border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            }`}
                          >
                            {equipped ? '장착 중 (해제)' : '스킨 장착'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canBuy}
                            onClick={() => onBuySkin(skin.id, skin.price)}
                            className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                              canBuy
                                ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Gem className="h-3.5 w-3.5" />
                            <span>{skin.price} 크리스탈 구매</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Castle Lord Special Attacks */}
            <div className="mt-9">
              <h3 className="text-base font-bold text-cyan-300">성주의 특수공격</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {LORD_SKILLS.map((skill) => {
                  const owned = saveData.unlockedSkills.includes(skill.id);
                  const canBuy = saveData.crystals >= skill.crystalCost;

                  return (
                    <div
                      key={skill.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/75 p-4"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                            {skill.name}
                          </span>
                          <span className="font-mono-num">재사용 {skill.cooldown}s</span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                          {skill.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        {owned ? (
                          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-300">
                            <Check className="h-3.5 w-3.5" />
                            <span>해금 완료 (전투 중 사용 가능)</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!canBuy}
                            onClick={() => onBuySkill(skill.id, skill.crystalCost)}
                            className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                              canBuy
                                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Gem className="h-3.5 w-3.5" />
                            <span>{skill.crystalCost} 크리스탈 해금</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-[#0b0f17]/95 p-6 md:p-8 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="font-display flex items-center gap-2 text-2xl font-bold text-white">
                  <Trophy className="h-6 w-6 text-amber-400" />
                  <span>실시간 최고 웨이브 리더보드</span>
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  가장 긴 웨이브를 버텨낸 지휘관들의 실시간 순위입니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-amber-500/60 hover:text-amber-300 transition-colors whitespace-nowrap"
              >
                <Code2 className="h-4 w-4" />
                <span>Supabase SQL 스키마 보기</span>
              </button>
            </div>

            {!isSignedIn && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                <span>
                  Google 계정으로 로그인하면 본인의 최고 웨이브 기록이 실시간 리더보드에 등록됩니다.
                </span>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 font-bold text-slate-950 hover:bg-amber-400"
                >
                  로그인하기
                </button>
              </div>
            )}

            {leaderboardError && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
                리더보드를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
              </div>
            )}

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th className="py-3 px-3 font-semibold">순위</th>
                    <th className="py-3 px-3 font-semibold">지휘관</th>
                    <th className="py-3 px-3 font-semibold text-right">최고 웨이브</th>
                    <th className="py-3 px-3 font-semibold text-right">누적 처치</th>
                    <th className="py-3 px-3 font-semibold text-right">보스 토벌</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                        아직 등록된 기록이 없습니다. 첫 번째 방어 기록을 세워보세요!
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((row, idx) => {
                      const isMe = isSignedIn && row.uid === saveData.uid;
                      return (
                        <tr
                          key={row.uid}
                          className={isMe ? 'bg-amber-500/10 text-white' : 'text-slate-200'}
                        >
                          <td className="py-3 px-3 font-mono-num font-bold">
                            {idx === 0 ? (
                              <span className="text-amber-400">1</span>
                            ) : idx === 1 ? (
                              <span className="text-slate-300">2</span>
                            ) : idx === 2 ? (
                              <span className="text-amber-600">3</span>
                            ) : (
                              idx + 1
                            )}
                          </td>
                          <td className="py-3 px-3 font-medium">
                            {row.displayName}
                            {isMe && (
                              <span className="ml-2 text-xs text-amber-400">(나)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num font-bold text-amber-300">
                            Wave {row.bestWave}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-slate-300">
                            {row.totalKills.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-slate-300">
                            {row.bossesDefeated.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Tower Guide Footer Strip on Home Tab */}
      {activeTab === 'home' && (
        <footer className="pointer-events-auto border-t border-slate-800/70 bg-[#0b0f17]/90 px-6 py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Swords className="h-3.5 w-3.5 text-sky-400" />
                아처: 1초 사격 · 장거리 공속 트리
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                플레임: 3초 고화력 · 30% 화상
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Snowflake className="h-3.5 w-3.5 text-cyan-400" />
                프로스트: 광역 감속 & 빙결
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Zap className="h-3.5 w-3.5 text-purple-400" />
                라이트닝: 다중 연쇄 번개
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>5웨이브 중간보스 · 10웨이브 빅보스 (중복 없음)</span>
            </div>
          </div>
        </footer>
      )}

      {/* Supabase SQL Schema Reference Modal */}
      {showSqlModal && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-[#0f172a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Supabase (PostgreSQL) 실시간 리더보드 테이블 SQL
                </h3>
                <p className="text-xs text-slate-400">
                  Supabase SQL Editor에 바로 붙여넣어 사용할 수 있는 테이블 · RLS · Realtime 스크립트입니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  {copiedSql ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedSql ? '복사됨' : 'SQL 복사'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <pre className="overflow-auto p-5 font-mono text-xs leading-relaxed text-slate-200">
              <code>{supabaseSqlText}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
