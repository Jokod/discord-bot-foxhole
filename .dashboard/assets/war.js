'use strict';

(function() {
	'use strict';

	window.Dashboard = window.Dashboard || {};

	const { t } = window.DashboardI18n;
	const WP = window.WarProgress;

	let warTickTimer = null;
	let warState = null;

	function stopWarTick() {
		if (warTickTimer) {
			clearInterval(warTickTimer);
			warTickTimer = null;
		}
	}

	function formatLiveDuration(parts) {
		const p = WP.formatDurationParts(parts);
		return t('war.elapsedValue', { d: p.d, h: p.h, m: p.m, s: p.s });
	}

	function formatEndsLine(remaining, vp) {
		const time = formatLiveDuration(remaining);
		if (vp == null) return time;
		return t('war.endsWithVp', { time, n: window.Dashboard.fmt.n(vp) });
	}

	function computeWarTimers(war, now = Date.now()) {
		const progress = war.conquestStartTime
			? WP.interpolateWarProgress(war.conquestStartTime, war.conquestEndTime, now)
			: null;
		let ended = Boolean(war.ended);
		if (progress?.ended || (war.winner && war.winner !== 'NONE')) ended = true;

		const elapsed = progress && progress.days != null
			? progress
			: (war.elapsed || null);

		let remaining = null;
		if (!ended && war.scheduledConquestEndTime) {
			remaining = WP.remainingUntil(war.scheduledConquestEndTime, now);
			if (remaining.expired) remaining = null;
		}

		return {
			ended,
			dayOfWar: progress?.dayOfWar ?? war.dayOfWar ?? null,
			elapsed,
			remaining,
			vp: war.effectiveRequiredVictoryTowns ?? war.requiredVictoryTowns ?? null,
		};
	}

	function updateWarTimersDom() {
		if (!warState) return;
		const timers = computeWarTimers(warState);
		const elapsedEl = document.querySelector('[data-war-elapsed]');
		if (elapsedEl && timers.elapsed && timers.elapsed.days != null) {
			elapsedEl.textContent = formatLiveDuration(timers.elapsed);
		}
		const endsRow = document.querySelector('[data-war-ends-row]');
		const endsEl = document.querySelector('[data-war-ends]');
		if (endsRow && endsEl) {
			if (timers.remaining && !timers.ended) {
				endsRow.hidden = false;
				endsEl.textContent = formatEndsLine(timers.remaining, timers.vp);
			}
			else {
				endsRow.hidden = true;
			}
		}
	}

	function startWarTick() {
		stopWarTick();
		if (!warState?.available) return;
		updateWarTimersDom();
		warTickTimer = setInterval(updateWarTimersDom, 1000);
	}

	function renderWar(data) {
		const el = document.getElementById('warBar');
		const { escapeHtml, fmt } = window.Dashboard;
		const war = data?.war;
		if (!war?.available || war.warNumber == null) {
			stopWarTick();
			warState = null;
			el.hidden = true;
			el.className = 'war-bar';
			el.innerHTML = '';
			return;
		}

		warState = war;
		const timers = computeWarTimers(war);
		const ended = timers.ended;
		let winnerKey = 'war.winnerNone';
		if (war.winner === 'WARDEN') winnerKey = 'war.winnerWarden';
		else if (war.winner === 'COLONIAL') winnerKey = 'war.winnerColonial';
		else if (ended) winnerKey = 'war.ended';

		const winner = war.winner && war.winner !== 'NONE' ? war.winner : null;
		const statusClass = ended
			? (winner === 'WARDEN' ? 'war-status--warden' : winner === 'COLONIAL' ? 'war-status--colonial' : 'war-status--ended')
			: 'war-status--live';
		const need = war.effectiveRequiredVictoryTowns ?? war.requiredVictoryTowns;
		const vt = war.victoryTowns;
		const pct = (n) => (need > 0 ? Math.min(100, Math.round((Number(n) / need) * 100)) : 0);

		const meta = [];
		if (timers.dayOfWar != null) {
			meta.push([t('war.day'), t('war.dayValue', { n: fmt.n(timers.dayOfWar) })]);
		}
		if (war.conquestStartTime) {
			meta.push([t('war.start'), fmt.dt(new Date(war.conquestStartTime).toISOString())]);
		}
		if (ended && war.conquestEndTime) {
			meta.push([t('war.end'), fmt.dt(new Date(war.conquestEndTime).toISOString())]);
		}
		else if (!ended && war.scheduledConquestEndTime) {
			meta.push([t('war.scheduledEnd'), fmt.dt(new Date(war.scheduledConquestEndTime).toISOString())]);
		}
		if (!vt && war.requiredVictoryTowns != null) {
			meta.push([
				t('war.towns'),
				war.shortRequiredVictoryTowns != null
					? `${fmt.n(war.requiredVictoryTowns)} · ${t('war.shortTowns', { n: fmt.n(war.shortRequiredVictoryTowns) })}`
					: fmt.n(war.requiredVictoryTowns),
			]);
		}
		else if (war.shortRequiredVictoryTowns != null && !ended) {
			meta.push([t('war.towns'), t('war.shortTowns', { n: fmt.n(war.shortRequiredVictoryTowns) })]);
		}

		let scoreHtml = '';
		if (vt) {
			const col = Number(vt.colonial) || 0;
			const ward = Number(vt.warden) || 0;
			const scorched = Number(vt.scorched) || 0;
			scoreHtml = `
			<div class="war-score" role="group" aria-label="${escapeHtml(t('war.towns'))}">
				<div class="war-faction war-faction--colonial${winner === 'COLONIAL' ? ' is-winner' : ''}">
					<div class="war-faction-top">
						<span class="war-faction-name">${escapeHtml(t('war.winnerColonial'))}</span>
						<span class="war-faction-score">${escapeHtml(need != null ? `${fmt.n(col)} / ${fmt.n(need)}` : fmt.n(col))}</span>
					</div>
					<div class="war-track" aria-hidden="true"><span class="war-fill" style="width:${pct(col)}%"></span></div>
				</div>
				<div class="war-score-vs" aria-hidden="true">${escapeHtml(t('war.vs'))}</div>
				<div class="war-faction war-faction--warden${winner === 'WARDEN' ? ' is-winner' : ''}">
					<div class="war-faction-top">
						<span class="war-faction-name">${escapeHtml(t('war.winnerWarden'))}</span>
						<span class="war-faction-score">${escapeHtml(need != null ? `${fmt.n(ward)} / ${fmt.n(need)}` : fmt.n(ward))}</span>
					</div>
					<div class="war-track" aria-hidden="true"><span class="war-fill" style="width:${pct(ward)}%"></span></div>
				</div>
			</div>
			${scorched > 0 ? `<p class="war-scorched">${escapeHtml(t('war.scorchedTowns'))}: <strong>${escapeHtml(fmt.n(scorched))}</strong></p>` : ''}
		`;
		}

		const elapsedText = timers.elapsed && timers.elapsed.days != null
			? formatLiveDuration(timers.elapsed)
			: '—';
		const showEnds = !ended && timers.remaining;
		const endsText = showEnds ? formatEndsLine(timers.remaining, timers.vp) : '';

		el.className = `war-bar${ended ? ' war-bar--ended' : ' war-bar--live'}${winner === 'WARDEN' ? ' war-bar--warden' : ''}${winner === 'COLONIAL' ? ' war-bar--colonial' : ''}`;
		el.hidden = false;
		el.innerHTML = `
		<header class="war-head">
			<div class="war-head-main">
				<p class="war-title">${escapeHtml(ended ? t('war.titleEnded') : t('war.worldConquest', { n: fmt.n(war.warNumber) }))}</p>
				${!ended ? `<span class="war-live-elapsed mono" data-war-elapsed>${escapeHtml(elapsedText)}</span>` : `<span class="war-num">#${escapeHtml(fmt.n(war.warNumber))}</span>`}
				<span class="war-status ${statusClass}">${escapeHtml(t(winnerKey))}</span>
			</div>
			${war.playersOnline != null ? `
				<div class="war-players">
					<span class="label">${escapeHtml(t('war.players'))}</span>
					<span class="value">${escapeHtml(fmt.n(war.playersOnline))}</span>
				</div>` : ''}
		</header>
		${showEnds || (!ended && war.scheduledConquestEndTime) ? `
		<div class="war-ends" data-war-ends-row ${showEnds ? '' : 'hidden'}>
			<span class="label">${escapeHtml(t('war.ends'))}</span>
			<span class="value mono" data-war-ends>${escapeHtml(endsText)}</span>
		</div>` : ''}
		${ended && timers.elapsed && timers.elapsed.days != null ? `
		<div class="war-ends">
			<span class="label">${escapeHtml(t('war.elapsed'))}</span>
			<span class="value mono">${escapeHtml(elapsedText)}</span>
		</div>` : ''}
		${scoreHtml}
		${meta.length ? `<div class="war-meta">${meta.map(([label, value]) => `
			<div class="war-item"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(String(value))}</span></div>
		`).join('')}</div>` : ''}
	`;

		startWarTick();
	}

	window.Dashboard.renderWar = renderWar;
	window.Dashboard.stopWarTick = stopWarTick;
})();
