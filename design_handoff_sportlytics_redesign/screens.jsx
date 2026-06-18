/* global React, Crest, FormDots, Eyebrow, ProbBar, RankBars */
const { useState: useS, useMemo } = React;

// ============ DASHBOARD ============
function Dashboard({ accent }) {
  const S = window.SPORT;
  const top = S.teams;
  const leader = top[0];
  const stats = [
    { label: 'Clubs Tracked', value: top.length },
    { label: 'Matches Played', value: top.reduce((a, t) => a + t.played, 0) / 2 | 0 },
    { label: 'Predictions', value: S.PREDICTIONS.length },
    { label: 'Goals Scored', value: top.reduce((a, t) => a + t.goalsFor, 0) },
  ];
  const barRows = top.slice(0, 6).map((t) => ({ code: t.code, name: t.code, value: t.points }));
  const barMax = Math.max(...barRows.map((r) => r.value));

  return (
    <div className="screen">
      <header className="screen-head">
        <Eyebrow n="01">DASHBOARD — SEASON 2024/25</Eyebrow>
        <h1 className="display">THE NUMBERS<br />BEHIND THE GAME.</h1>
        <p className="lede">Live Premier League data, rule-based predictions and custom performance
          metrics — every figure computed from real results, not vibes.</p>
      </header>

      <div className="stat-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Recent Results</h2>
            <span className="panel-link">VIEW ALL →</span>
          </div>
          <div className="result-list">
            {S.RESULTS.map((m, i) => {
              const h = S.byCode(m.home), a = S.byCode(m.away);
              const hw = m.hs > m.as, aw = m.as > m.hs;
              return (
                <div className="result-row" key={i}>
                  <div className="result-side">
                    <Crest team={h} size={26} />
                    <span className={'rs-name' + (hw ? ' rs-win' : '')}>{h.name}</span>
                  </div>
                  <div className="result-score">{m.hs}<span>–</span>{m.as}</div>
                  <div className="result-side result-away">
                    <span className={'rs-name' + (aw ? ' rs-win' : '')}>{a.name}</span>
                    <Crest team={a} size={26} />
                  </div>
                  <span className="result-date">{m.date}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Points · Top 6</h2>
            <span className="panel-link">FULL TABLE →</span>
          </div>
          <RankBars rows={barRows} max={barMax} accent={accent} />
          <div className="leader-callout">
            <Crest team={leader} size={44} />
            <div>
              <div className="lc-label">LEAGUE LEADER</div>
              <div className="lc-name">{leader.teamName}</div>
            </div>
            <div className="lc-points" style={{ color: accent }}>{leader.points}<span>PTS</span></div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Upcoming Fixtures</h2>
          <span className="panel-link">FIXTURES →</span>
        </div>
        <div className="fixture-grid">
          {S.FIXTURES.map((f, i) => {
            const h = S.byCode(f.home), a = S.byCode(f.away);
            return (
              <div className="fixture-card" key={i}>
                <div className="fx-date">{f.date} · {f.time}</div>
                <div className="fx-teams">
                  <div className="fx-team"><Crest team={h} size={32} /><span>{h.code}</span></div>
                  <span className="fx-v">V</span>
                  <div className="fx-team"><Crest team={a} size={32} /><span>{a.code}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ============ TEAM ANALYTICS ============
const SORTS = [
  { key: 'points', label: 'Points' },
  { key: 'goalsFor', label: 'Goals For' },
  { key: 'goalDifference', label: 'Goal Diff' },
  { key: 'winRate', label: 'Win Rate' },
  { key: 'goalsPerMatch', label: 'Goals / Match' },
  { key: 'cleanSheets', label: 'Clean Sheets' },
];

function Analytics({ accent }) {
  const S = window.SPORT;
  const [sortBy, setSortBy] = useS('points');
  const [metricId, setMetricId] = useS('');

  const metric = S.METRICS.find((m) => String(m.id) === metricId);
  const withScore = useMemo(() => S.teams.map((t) => ({
    ...t, customScore: metric ? +S.evalMetric(metric.formula, t).toFixed(2) : undefined,
  })), [metricId]);

  const sorted = useMemo(() => [...withScore].sort((a, b) => {
    const key = sortBy === 'customScore' ? 'customScore' : sortBy;
    const av = a[key] ?? -Infinity, bv = b[key] ?? -Infinity;
    return (bv - av) || (b.goalDifference - a.goalDifference);
  }), [sortBy, metricId]);

  return (
    <div className="screen">
      <header className="screen-head">
        <Eyebrow n="02">TEAM ANALYTICS</Eyebrow>
        <h1 className="display">EVERY CLUB,<br />EVERY METRIC.</h1>
        <p className="lede">Sort the league on any statistic, then overlay a custom formula to rank
          clubs your way.</p>
      </header>

      <div className="toolbar">
        <div className="tb-group">
          <span className="tb-label">CUSTOM METRIC</span>
          <select className="select" value={metricId} onChange={(e) => {
            setMetricId(e.target.value);
            if (e.target.value && sortBy !== 'customScore') setSortBy('customScore');
            if (!e.target.value && sortBy === 'customScore') setSortBy('points');
          }}>
            <option value="">None</option>
            {S.METRICS.filter((m) => m.scope === 'team').map((m) => (
              <option key={m.id} value={String(m.id)}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="tb-group tb-sorts">
          <span className="tb-label">SORT BY</span>
          {SORTS.map((s) => (
            <button key={s.key}
              className={'chip' + (sortBy === s.key ? ' chip-on' : '')}
              onClick={() => setSortBy(s.key)}>{s.label}</button>
          ))}
          {metric && (
            <button className={'chip chip-metric' + (sortBy === 'customScore' ? ' chip-metric-on' : '')}
              onClick={() => setSortBy('customScore')}>★ {metric.name}</button>
          )}
        </div>
      </div>

      <div className="card-grid">
        {sorted.map((t, i) => (
          <article className="team-card" key={t.teamId}>
            <div className="tc-top">
              <span className="tc-rank">{String(i + 1).padStart(2, '0')}</span>
              <Crest team={t} size={40} />
              <div className="tc-id">
                <div className="tc-name">{t.teamName}</div>
                <div className="tc-city">{t.city}</div>
              </div>
              <div className="tc-points">
                <div className="tc-pts-val" style={{ color: accent }}>{t.points}</div>
                <div className="tc-pts-lbl">PTS</div>
              </div>
            </div>

            {metric && (
              <div className="tc-metric">
                <div>
                  <div className="tcm-name">★ {metric.name}</div>
                  <div className="tcm-formula">{metric.formula}</div>
                </div>
                <div className="tcm-score">{t.customScore}</div>
              </div>
            )}

            <div className="wdl">
              <div><b>{t.played}</b><span>MP</span></div>
              <div className="wdl-w"><b>{t.wins}</b><span>W</span></div>
              <div className="wdl-d"><b>{t.draws}</b><span>D</span></div>
              <div className="wdl-l"><b>{t.losses}</b><span>L</span></div>
            </div>

            <div className="mini-grid">
              <div className="mini"><span>WIN RATE</span><b>{t.winRate}%</b></div>
              <div className="mini"><span>GOAL DIFF</span><b className={t.goalDifference > 0 ? 'pos' : t.goalDifference < 0 ? 'neg' : ''}>{t.goalDifference > 0 ? '+' : ''}{t.goalDifference}</b></div>
              <div className="mini"><span>GOALS F/A</span><b>{t.goalsFor} / {t.goalsAgainst}</b></div>
              <div className="mini"><span>AVG/MATCH</span><b>{t.goalsPerMatch} / {t.concededPerMatch}</b></div>
              <div className="mini"><span>CLEAN SHEETS</span><b className="pos">{t.cleanSheets}</b></div>
              <div className="mini"><span>FAILED SCORE</span><b className="neg">{t.failedToScore}</b></div>
            </div>

            <div className="tc-form">
              <span className="tc-form-lbl">LAST 5</span>
              <FormDots form={t.form} />
            </div>
            <div className="tc-accent" style={{ background: `linear-gradient(90deg, ${t.primary}, transparent)` }} />
          </article>
        ))}
      </div>
    </div>
  );
}

// ============ PREDICTIONS ============
function Predictions({ accent }) {
  const S = window.SPORT;
  return (
    <div className="screen">
      <header className="screen-head">
        <div className="head-row">
          <div>
            <Eyebrow n="03">PREDICTIONS</Eyebrow>
            <h1 className="display">CALL THE<br />RESULT.</h1>
          </div>
          <button className="btn-primary" style={{ background: accent }}>+ NEW PREDICTION</button>
        </div>
        <p className="lede">Rule-based model using recent form (recency-weighted), scoring averages,
          win rate and a +15% home-advantage factor.</p>
      </header>

      <div className="pred-list">
        {S.PREDICTIONS.map((p) => {
          const h = S.byCode(p.home), a = S.byCode(p.away);
          return (
            <article className="pred-card" key={p.id}>
              <div className="pred-top">
                <div className="pred-team">
                  <Crest team={h} size={34} />
                  <span>{h.teamName}</span>
                </div>
                <div className="pred-mid">
                  <div className="pred-score">{p.phg}<span>–</span>{p.pag}</div>
                  <div className="pred-score-lbl">PREDICTED</div>
                </div>
                <div className="pred-team pred-team-r">
                  <span>{a.teamName}</span>
                  <Crest team={a} size={34} />
                </div>
              </div>
              <ProbBar hp={p.hp} dp={p.dp} ap={p.ap} home={h.code} away={a.code} />
              <div className="pred-foot">
                <p className="pred-note">{p.note}</p>
                <span className="conf-badge" style={{ borderColor: accent, color: accent }}>
                  {Math.round(p.conf * 100)}% CONF
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ============ CUSTOM METRICS ============
function Metrics({ accent }) {
  const S = window.SPORT;
  const [name, setName] = useS('');
  const [formula, setFormula] = useS('(goals_for * 2) + goal_difference');
  const [openId, setOpenId] = useS(1);

  function insert(v) { setFormula((f) => (f + (f && !/[\s(]$/.test(f) ? ' ' : '') + v)); }

  const open = S.METRICS.find((m) => m.id === openId);
  const results = useMemo(() => {
    if (!open) return [];
    return S.teams.map((t) => ({ name: t.teamName, code: t.code, primary: t.primary, played: t.played,
      score: +S.evalMetric(open.formula, t).toFixed(2) }))
      .sort((x, y) => y.score - x.score);
  }, [openId]);

  return (
    <div className="screen">
      <header className="screen-head">
        <Eyebrow n="04">CUSTOM METRICS</Eyebrow>
        <h1 className="display">BUILD YOUR<br />OWN RATING.</h1>
        <p className="lede">Compose a formula from team variables, save it, and rank the league instantly.</p>
      </header>

      <div className="grid-2 metrics-grid">
        <section className="panel builder">
          <h2 className="panel-title">Metric Builder</h2>
          <label className="field-label">NAME</label>
          <input className="input" placeholder="e.g. Attacking Threat" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="field-label">FORMULA</label>
          <textarea className="input formula-input" rows={2} value={formula} onChange={(e) => setFormula(e.target.value)} />
          <div className="preview-row">
            <span className="field-label" style={{ margin: 0 }}>PREVIEW (TOP CLUB)</span>
            <span className="preview-val" style={{ color: accent }}>
              {(() => { try { return S.evalMetric(formula, S.teams[0]).toFixed(2); } catch { return '—'; } })()}
            </span>
          </div>
          <label className="field-label">VARIABLES — TAP TO INSERT</label>
          <div className="var-chips">
            {S.VARIABLES.map((v) => (
              <button key={v} className="var-chip" onClick={() => insert(v)}>{v}</button>
            ))}
          </div>
          <div className="op-row">
            {['+', '−', '×', '÷', '(', ')'].map((o) => (
              <button key={o} className="op-chip"
                onClick={() => insert({ '−': '-', '×': '*', '÷': '/' }[o] || o)}>{o}</button>
            ))}
          </div>
          <button className="btn-primary block" style={{ background: accent }}>SAVE METRIC</button>
        </section>

        <section>
          <div className="panel-head" style={{ padding: '0 2px 14px' }}>
            <h2 className="panel-title">Saved Metrics · {S.METRICS.length}</h2>
          </div>
          <div className="saved-list">
            {S.METRICS.map((m) => (
              <div className="saved-card" key={m.id}>
                <div className="saved-head">
                  <div className="saved-id">
                    <span className="saved-name">{m.name}</span>
                    <span className="scope-tag">{m.scope}</span>
                  </div>
                  <button className={'mini-btn' + (openId === m.id ? ' mini-btn-on' : '')}
                    onClick={() => setOpenId(openId === m.id ? null : m.id)}>
                    {openId === m.id ? 'HIDE' : 'RESULTS'}
                  </button>
                </div>
                <div className="saved-formula">{m.formula}</div>
                <p className="saved-desc">{m.desc}</p>

                {openId === m.id && (
                  <div className="results-table">
                    {results.slice(0, 8).map((r, i) => (
                      <div className="rt-row" key={r.code}>
                        <span className="rt-rank">{i + 1}</span>
                        <Crest team={S.byCode(r.code)} size={22} />
                        <span className="rt-name">{r.name}</span>
                        <span className="rt-mp">{r.played} MP</span>
                        <span className="rt-score" style={{ color: accent }}>{r.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ============ STANDINGS ============
function Standings({ accent }) {
  const S = window.SPORT;
  return (
    <div className="screen">
      <header className="screen-head">
        <Eyebrow n="05">STANDINGS — PREMIER LEAGUE</Eyebrow>
        <h1 className="display">THE TABLE.</h1>
      </header>

      <div className="panel table-panel">
        <div className="table-head">
          <span className="th-rank">#</span>
          <span className="th-club">CLUB</span>
          <span>MP</span><span>W</span><span>D</span><span>L</span>
          <span>GF</span><span>GA</span><span>GD</span>
          <span className="th-form">FORM</span>
          <span className="th-pts">PTS</span>
        </div>
        {S.teams.map((t, i) => {
          const zone = i < 4 ? 'ucl' : i < 5 ? 'uel' : i >= S.teams.length - 3 ? 'rel' : '';
          return (
            <div className={'table-row' + (i === 0 ? ' table-row-top' : '')} key={t.teamId}>
              <span className={'tr-rank zone-' + zone}>{i + 1}</span>
              <span className="tr-club"><Crest team={t} size={28} /><b>{t.teamName}</b></span>
              <span>{t.played}</span>
              <span className="num-w">{t.wins}</span>
              <span>{t.draws}</span>
              <span className="num-l">{t.losses}</span>
              <span>{t.goalsFor}</span>
              <span>{t.goalsAgainst}</span>
              <span className={t.goalDifference > 0 ? 'pos' : t.goalDifference < 0 ? 'neg' : ''}>
                {t.goalDifference > 0 ? '+' : ''}{t.goalDifference}</span>
              <span className="tr-form"><FormDots form={t.form} /></span>
              <span className="tr-pts" style={i === 0 ? { color: accent } : undefined}>{t.points}</span>
            </div>
          );
        })}
        <div className="table-legend">
          <span><i className="lg lg-ucl"></i> Champions League</span>
          <span><i className="lg lg-uel"></i> Europa</span>
          <span><i className="lg lg-rel"></i> Relegation</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, Analytics, Predictions, Metrics, Standings });
