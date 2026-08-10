'use strict';

(function() {
	'use strict';

	window.Dashboard = window.Dashboard || {};

	const { t } = window.DashboardI18n;

	function getStore() {
		return window.Dashboard;
	}

	function factionKey(factions) {
		const set = new Set(factions || []);
		const hasC = set.has('colonial');
		const hasW = set.has('warden');
		if (hasC && hasW) return 'both';
		if (hasC) return 'colonial';
		if (hasW) return 'warden';
		return 'none';
	}

	function factionBadges(factions) {
		const key = factionKey(factions);
		if (key === 'both') {
			return `<span class="badge info">${t('materials.factionBoth')}</span>`;
		}
		if (key === 'colonial') {
			return `<span class="badge ok">${t('materials.factionColonial')}</span>`;
		}
		if (key === 'warden') {
			return `<span class="badge warn">${t('materials.factionWarden')}</span>`;
		}
		return `<span class="badge">${t('materials.factionUnknown')}</span>`;
	}

	function campLine(factions) {
		return `<div class="mat-camp-line"><span class="mat-camp-label">${t('materials.campLabel')}</span>${factionBadges(factions)}</div>`;
	}

	function categoryBadges(item) {
		const { escapeHtml } = getStore();
		return `<div class="mat-cat-line">
			<span class="badge info">${escapeHtml(item.categoryIcon || '')} ${escapeHtml(labelCat(item.category))}</span>
			<span class="badge muted">${escapeHtml(labelSub(item.subcategory))}</span>
		</div>`;
	}

	function materialMetaBlock(item) {
		return `<div class="mat-card-meta">${campLine(item.faction)}${categoryBadges(item)}</div>`;
	}

	function iconCell(item) {
		const { escapeHtml } = getStore();
		if (item.iconUrl) {
			return `<img class="mat-icon" src="${escapeHtml(item.iconUrl)}" alt="" loading="lazy" width="40" height="40" />`;
		}
		return `<span class="mat-icon-fallback" aria-hidden="true">${escapeHtml(item.categoryIcon || '📦')}</span>`;
	}

	function labelCat(id) {
		const key = `materials.cat.${id}`;
		const translated = t(key);
		return translated === key ? id : translated;
	}

	function labelSub(id) {
		const key = `materials.sub.${id}`;
		const translated = t(key);
		return translated === key ? id : translated;
	}

	function filteredMaterials() {
		const { materialsData, state } = getStore();
		const items = materialsData?.items || [];
		const q = (state.matSearch || '').trim().toLowerCase();
		const cat = state.matCategory || 'all';
		const sub = state.matSubcategory || 'all';
		const faction = state.matFaction || 'all';
		const sort = state.matSort || 'name';
		const dir = state.matSortDir === 'desc' ? -1 : 1;

		let list = items.filter((m) => {
			if (cat !== 'all' && m.category !== cat) return false;
			if (sub !== 'all' && m.subcategory !== sub) return false;
			if (faction !== 'all') {
				const fk = factionKey(m.faction);
				if (faction === 'both' && fk !== 'both') return false;
				if (faction === 'colonial' && fk !== 'colonial') return false;
				if (faction === 'warden' && fk !== 'warden') return false;
			}
			if (q) {
				const blob = `${m.itemName} ${m.itemDesc} ${m.category} ${m.subcategory} ${m.itemCategory}`.toLowerCase();
				if (!blob.includes(q)) return false;
			}
			return true;
		});

		list = list.slice().sort((a, b) => {
			let cmp;
			if (sort === 'category') {
				cmp = a.category.localeCompare(b.category, 'en')
					|| a.subcategory.localeCompare(b.subcategory, 'en')
					|| a.itemName.localeCompare(b.itemName, 'en');
			}
			else if (sort === 'subcategory') {
				cmp = a.subcategory.localeCompare(b.subcategory, 'en')
					|| a.itemName.localeCompare(b.itemName, 'en');
			}
			else {
				cmp = a.itemName.localeCompare(b.itemName, 'en');
			}
			return cmp * dir;
		});
		return list;
	}

	function fillCategoryOptions() {
		const { materialsData, escapeHtml, state } = getStore();
		const catSel = document.getElementById('fMatCategory');
		const subSel = document.getElementById('fMatSubcategory');
		if (!catSel || !subSel) return;

		const cats = materialsData?.categories || [];
		const prevCat = state.matCategory || 'all';
		const prevSub = state.matSubcategory || 'all';

		catSel.innerHTML = `<option value="all">${escapeHtml(t('materials.all'))}</option>`
			+ cats.map((c) =>
				`<option value="${escapeHtml(c.id)}">${escapeHtml(c.icon)} ${escapeHtml(labelCat(c.id))}</option>`).join('');
		catSel.value = cats.some((c) => c.id === prevCat) ? prevCat : 'all';

		fillSubcategoryOptions(catSel.value, prevSub);
	}

	function fillSubcategoryOptions(categoryId, preferred) {
		const { materialsData, escapeHtml, state } = getStore();
		const subSel = document.getElementById('fMatSubcategory');
		if (!subSel) return;
		const cats = materialsData?.categories || [];
		let subs;
		if (categoryId && categoryId !== 'all') {
			const cat = cats.find((c) => c.id === categoryId);
			subs = cat?.subcategories || [];
		}
		else {
			const set = new Set();
			cats.forEach((c) => (c.subcategories || []).forEach((s) => set.add(s)));
			subs = [...set].sort();
		}
		subSel.innerHTML = `<option value="all">${escapeHtml(t('materials.all'))}</option>`
			+ subs.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(labelSub(s))}</option>`).join('');
		const want = preferred ?? state.matSubcategory ?? 'all';
		subSel.value = want === 'all' || subs.includes(want) ? want : 'all';
		state.matSubcategory = subSel.value;
	}

	function renderMaterials() {
		const store = getStore();
		const {
			materialsLoading, materialsData, state, fmt, escapeHtml,
		} = store;
		const meta = document.getElementById('materialsMeta');
		const grid = document.getElementById('materialsGrid');
		const tableBody = document.getElementById('materialsTableBody');
		const gridPanel = document.getElementById('materialsGridPanel');
		const tablePanel = document.getElementById('materialsTablePanel');
		if (!meta) return;

		if (materialsLoading) {
			meta.textContent = t('materials.metaLoading');
			return;
		}
		if (!materialsData) {
			meta.textContent = t('materials.metaIdle');
			return;
		}

		const list = filteredMaterials();
		const total = materialsData.items?.length || 0;
		const withIcon = materialsData.icons?.with_icon ?? 0;
		meta.textContent = t('materials.metaCount', {
			shown: fmt.n(list.length),
			total: fmt.n(total),
			icons: fmt.n(withIcon),
		});

		const view = state.matView || 'grid';
		if (gridPanel) gridPanel.hidden = view !== 'grid';
		if (tablePanel) tablePanel.hidden = view !== 'table';

		if (view === 'table' && tableBody) {
			tableBody.innerHTML = list.length ? list.map((m) => `
			<tr data-mat-name="${escapeHtml(m.itemName)}">
				<td class="mat-icon-cell">${iconCell(m)}</td>
				<td><strong>${escapeHtml(m.itemName)}</strong></td>
				<td>${factionBadges(m.faction)}</td>
				<td>${escapeHtml(m.categoryIcon || '')} ${escapeHtml(labelCat(m.category))}</td>
				<td>${escapeHtml(labelSub(m.subcategory))}</td>
				<td class="muted mat-desc-cell">${escapeHtml((m.itemDesc || '').slice(0, 120))}${(m.itemDesc || '').length > 120 ? '…' : ''}</td>
			</tr>`).join('') : `<tr><td colspan="6" class="muted">${t('materials.empty')}</td></tr>`;
		}

		if (view === 'grid' && grid) {
			grid.innerHTML = list.length ? list.map((m) => `
			<button type="button" class="mat-card" data-mat-name="${escapeHtml(m.itemName)}">
				<div class="mat-card-icon">${iconCell(m)}</div>
				<div class="mat-card-body">
					<strong class="mat-card-title">${escapeHtml(m.itemName)}</strong>
					${materialMetaBlock(m)}
					<p class="mat-card-desc muted">${escapeHtml((m.itemDesc || '').slice(0, 140))}${(m.itemDesc || '').length > 140 ? '…' : ''}</p>
				</div>
			</button>`).join('') : `<p class="muted">${t('materials.empty')}</p>`;
		}
	}

	function openMaterialDrawer(item) {
		const { escapeHtml } = getStore();
		if (!item) return;
		getStore().selectedGuildId = null;
		getStore().selectedMaterialName = item.itemName;
		const titleEl = document.querySelector('#drawer > .actions strong');
		if (titleEl) titleEl.textContent = t('materials.drawerTitle');
		const actions = document.getElementById('guildActionsBar');
		if (actions) actions.hidden = true;

		const extras = [
			item.damageDesc ? `<div><span>${t('materials.damageDesc')}</span><strong>${escapeHtml(item.damageDesc)}</strong></div>` : '',
			item.vehiclePen ? `<div><span>${t('materials.vehiclePen')}</span><strong>${escapeHtml(item.vehiclePen)}</strong></div>` : '',
			item.highVelocityBonus ? `<div><span>${t('materials.hvBonus')}</span><strong>${escapeHtml(item.highVelocityBonus)}</strong></div>` : '',
			item.numberProducedBonus ? `<div><span>${t('materials.producedBonus')}</span><strong>${escapeHtml(item.numberProducedBonus)}</strong></div>` : '',
		].filter(Boolean).join('');

		document.getElementById('drawerBody').innerHTML = `
		<div class="mat-drawer-head">
			${iconCell(item)}
			<div>
				<h3>${escapeHtml(item.itemName)}</h3>
				${campLine(item.faction)}
			</div>
		</div>
		<div class="stat-list">
			<div><span>${t('materials.colCategory')}</span><strong>${escapeHtml(item.categoryIcon || '')} ${escapeHtml(labelCat(item.category))}</strong></div>
			<div><span>${t('materials.colSubcategory')}</span><strong>${escapeHtml(labelSub(item.subcategory))}</strong></div>
			${extras}
		</div>
		<p class="mat-drawer-desc">${escapeHtml(item.itemDesc || '')}</p>
		<p><a href="${escapeHtml(item.wikiUrl)}" target="_blank" rel="noopener">${t('materials.wikiLink')}</a></p>
	`;
		document.getElementById('drawer').classList.add('open');
		document.getElementById('drawer').setAttribute('aria-hidden', 'false');
		document.getElementById('backdrop').classList.add('open');
	}

	function findMaterial(name) {
		return (getStore().materialsData?.items || []).find((m) => m.itemName === name) || null;
	}

	async function loadMaterials(force = false) {
		const store = getStore();
		if (store.materialsData && !force) {
			renderMaterials();
			return;
		}
		store.materialsLoading = true;
		renderMaterials();
		try {
			store.materialsData = await store.api('/api/materials');
			fillCategoryOptions();
		}
		catch (err) {
			if (err.status === 401) return;
			const meta = document.getElementById('materialsMeta');
			if (meta) {
				meta.innerHTML = `<span class="error">${store.escapeHtml(t('error.materials', { msg: err.message }))}</span>`;
			}
			store.materialsLoading = false;
			return;
		}
		store.materialsLoading = false;
		renderMaterials();
	}

	Object.assign(window.Dashboard, {
		filteredMaterials,
		renderMaterials,
		loadMaterials,
		openMaterialDrawer,
		findMaterial,
		fillCategoryOptions,
		fillSubcategoryOptions,
		factionKey,
	});
})();
