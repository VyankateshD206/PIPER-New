import Link from 'next/link';

import { RequestAccessForm } from '@/components/RequestAccessForm';

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-10 sm:px-6">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.75)]" />
              AI powered • Personalized • Spotify-inspired
            </p>

            <h1 className="mt-5 text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl">
              <span className="bg-linear-to-r from-emerald-300 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                PIPER
              </span>{' '}
              turns your mood into music.
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-white/80">
              A mood-aware playlist engine that understands your vibe and generates Spotify playlists that feel personal, intentional, and seamless.
            </p>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              Pick a mood. Let the system do the thinking.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#request-access"
                className="piper-btn piper-btn-primary h-12 px-7"
              >
                Request Access
              </Link>
              <Link
                href="/dashboard"
                className="piper-btn piper-btn-secondary h-12 px-7"
              >
                Go to Dashboard
              </Link>
            </div>

            <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/75 backdrop-blur">
              <p className="font-semibold text-white">Invite-only access</p>
              <p className="mt-1">
              PIPER currently operates with invite-only access  <br/>
              
              </p>
              <p className="mt-1">
                Request access above and we’ll notify you when your account is approved.
              </p>
            </div>
          </div>

          <div className="relative flex min-h-90 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.10),0_28px_90px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_30%_20%,rgba(16,185,129,0.20),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_420px_at_80%_30%,rgba(34,211,238,0.12),transparent_55%)]" />
            <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 bottom-8 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />

            <div className="pointer-events-none absolute inset-0 opacity-[0.20] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] bg-size-[18px_18px]" />

            <div className="relative flex min-h-0 flex-1 flex-col">
              <div>
                {/* <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300/90">
                  FUTURISTIC VISUAL PANEL
                </p> */}
                <h3 className="mt-2 text-balance text-lg font-semibold tracking-tight text-emerald-300/90">
                  Mood • Signal • Playlist
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  A real-time mood pipeline that transforms emotional signals into curated soundscapes.
                </p>
              </div>

              <div className="relative mt-7 flex min-h-0 flex-1 flex-col">
                <div className="absolute inset-0 rounded-2xl border border-white/10 bg-black/15" />
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-cyan-300/20 to-transparent" />

                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl p-4">
                  <div className="relative min-h-45 flex-1 overflow-hidden">
                    <div className="absolute inset-0 piper-wave" aria-hidden="true">
                      <svg
                        className="h-full w-full"
                        viewBox="0 0 800 240"
                        preserveAspectRatio="none"
                        role="presentation"
                      >
                        <defs>
                          <linearGradient id="piperWave" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(16,185,129,0.00)" />
                            <stop offset="20%" stopColor="rgba(16,185,129,0.55)" />
                            <stop offset="55%" stopColor="rgba(34,211,238,0.38)" />
                            <stop offset="85%" stopColor="rgba(16,185,129,0.55)" />
                            <stop offset="100%" stopColor="rgba(16,185,129,0.00)" />
                          </linearGradient>
                        </defs>

                        <g className="piper-wave-track">
                          <path
                            d="M 0 120 C 60 75, 120 165, 180 120 C 240 75, 300 165, 360 120 C 420 75, 480 165, 540 120 C 600 75, 660 165, 720 120 C 760 92, 780 135, 800 120"
                            fill="none"
                            stroke="url(#piperWave)"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="piper-wave-line"
                          />
                          <path
                            d="M 0 120 C 60 95, 120 145, 180 120 C 240 95, 300 145, 360 120 C 420 95, 480 145, 540 120 C 600 95, 660 145, 720 120 C 760 104, 780 132, 800 120"
                            fill="none"
                            stroke="rgba(16,185,129,0.20)"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="piper-wave-glow"
                          />
                        </g>
                      </svg>
                    </div>

                    <div className="absolute inset-0 piper-scan" aria-hidden="true" />

                    <div className="absolute inset-0 z-10" aria-hidden="true">
                      {[
                        { label: 'valence', top: '16%', left: '10%', delay: '0s' },
                        { label: 'energy', top: '20%', right: '10%', delay: '0.8s' },
                        { label: 'tempo', bottom: '44%', left: '12%', delay: '1.5s' },
                        { label: 'vibe cluster', bottom: '18%', right: '12%', delay: '2.2s' },
                        { label: 'mood vector', top: '36%', left: '40%', delay: '2.9s' },
                        { label: 'arousal', top: '46%', right: '22%', delay: '3.6s' },
                        { label: 'dynamics', top: '62%', left: '18%', delay: '4.1s' },
                      ].map((tag) => (
                        <span
                          key={tag.label}
                          className="piper-float-tag absolute rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/75 backdrop-blur whitespace-nowrap"
                          style={{
                            top: 'top' in tag ? tag.top : undefined,
                            left: 'left' in tag ? tag.left : undefined,
                            right: 'right' in tag ? tag.right : undefined,
                            bottom: 'bottom' in tag ? tag.bottom : undefined,
                            animationDelay: tag.delay,
                          }}
                        >
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/90 align-middle shadow-[0_0_14px_rgba(16,185,129,0.55)]" />
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-14">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur transition duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.10),0_28px_90px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300/90">
              Features
            </p>
            <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-white">
              Built to feel personal, fast, and intentional.
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-base font-semibold text-white">Mood-Aware Intelligence</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  PIPER analyzes mood signals and audio features to group tracks into emotional clusters, generating playlists that reflect your current state.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-base font-semibold text-white">Deep Personalization</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  PIPER analyzes your current top tracks to understand your musical preferences before generating any playlist—nothing is random.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-base font-semibold text-white">Audio Feature–Based Matching</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Songs are grouped using Spotify audio features like valence, energy, tempo, and loudness to maintain a coherent emotional flow.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-base font-semibold text-white">Instant Playlist Creation</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Choose a mood and receive a personalized playlist, automatically created and added to your Spotify library.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="mt-14">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.10),0_28px_90px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300/90">
              About
            </p>
            <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-white">
              A futuristic playlist generator built around your mood.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              PIPER is a personalized, mood-based music recommendation system that generates Spotify playlists using your listening history.
Instead of suggesting random tracks, PIPER analyzes your current top songs, extracts meaningful audio features, and applies mood-based clustering to create playlists aligned with how you feel and what you enjoy.
            </p>
          </div>
        </section>

        <section id="request-access" className="mt-14">
          <div className="mx-auto max-w-3xl">
            <RequestAccessForm />
          </div>
        </section>

        <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-white/50">
          Made by Vyankatesh Deshpande | BTech CSE, IIT Jodhpur
        </footer>
      </main>
    </div>
  );
}
