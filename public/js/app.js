// =============================================
// VotaRegistro - App Logic
// =============================================

let currentPage = 1;
let currentSearch = '';
let exportMenuOpen = false;

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadVoters();

    // Search with debounce
    let searchTimer;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentSearch = e.target.value.trim();
            currentPage = 1;
            loadVoters();
        }, 350);
    });

    // Close export menu on outside click
    document.addEventListener('click', (e) => {
        if (exportMenuOpen && !e.target.closest('.export-menu') && !e.target.closest('.btn-export')) {
            document.getElementById('export-menu').classList.remove('active');
            exportMenuOpen = false;
        }
    });

    // Close modal on overlay click
    document.getElementById('modal-votante').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
});

// ---- API ----
async function api(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(endpoint, opts);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error');
    return data;
}

// ---- Toast ----
function toast(msg, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ---- Stats ----
async function loadStats() {
    try {
        const stats = await api('/api/stats');
        document.getElementById('stat-total').textContent = stats.total;
        if (stats.barrios.length > 0) {
            const chip = document.getElementById('stat-barrio-chip');
            chip.style.display = '';
            document.getElementById('stat-barrio-num').textContent = stats.barrios.length;
            document.getElementById('stat-barrio-label').textContent = 'Barrios';
        }
    } catch (e) { console.error(e); }
}

// ---- Load Voters ----
async function loadVoters() {
    const list = document.getElementById('voters-list');
    list.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Cargando...</p></div>';

    try {
        let url = `/api/votantes?page=${currentPage}&limit=30`;
        if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
        const result = await api(url);

        if (result.data.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>${currentSearch ? 'No se encontraron resultados' : 'No hay votantes registrados'}</p>
                    ${!currentSearch ? '<button class="btn btn-primary" onclick="openNewModal()"><i class="fas fa-plus"></i> Registrar Primer Votante</button>' : ''}
                </div>
            `;
            document.getElementById('pagination').style.display = 'none';
            return;
        }

        list.innerHTML = result.data.map(v => `
            <div class="voter-card">
                <div class="voter-card-header">
                    <div class="voter-avatar">${(v.nombre[0] || '').toUpperCase()}${(v.apellido[0] || '').toUpperCase()}</div>
                    <div>
                        <div class="voter-name">${v.nombre} ${v.apellido}</div>
                        <div class="voter-cedula"><i class="fas fa-id-card"></i> CI: ${v.cedula}</div>
                    </div>
                </div>
                <div class="voter-details">
                    ${v.barrio ? `<div class="voter-detail"><div class="voter-detail-label">Barrio</div><div class="voter-detail-value">${v.barrio}</div></div>` : ''}
                    ${v.local_voto ? `<div class="voter-detail"><div class="voter-detail-label">Local de Voto</div><div class="voter-detail-value">${v.local_voto}</div></div>` : ''}
                    ${v.celular ? `<div class="voter-detail"><div class="voter-detail-label">Celular</div><div class="voter-detail-value">${v.celular}</div></div>` : ''}
                    ${v.correo ? `<div class="voter-detail"><div class="voter-detail-label">Correo</div><div class="voter-detail-value">${v.correo}</div></div>` : ''}
                    ${v.direccion ? `<div class="voter-detail" style="grid-column:1/-1"><div class="voter-detail-label">Direccion</div><div class="voter-detail-value">${v.direccion}</div></div>` : ''}
                </div>
                <div class="voter-actions">
                    <button class="btn btn-edit btn-sm" onclick='editVotante(${JSON.stringify(v).replace(/'/g,"&#39;")})'>
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-delete btn-sm" onclick="deleteVotante(${v.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');

        // Pagination
        renderPagination(result);
    } catch (e) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar datos</p></div>`;
    }
}

function renderPagination(result) {
    const pag = document.getElementById('pagination');
    if (result.pages <= 1) { pag.style.display = 'none'; return; }
    pag.style.display = 'flex';
    pag.innerHTML = `
        <button class="btn btn-outline btn-sm" ${currentPage <= 1 ? 'disabled' : ''} onclick="goPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
        <span class="pagination-info">${currentPage} / ${result.pages} (${result.total} registros)</span>
        <button class="btn btn-outline btn-sm" ${currentPage >= result.pages ? 'disabled' : ''} onclick="goPage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

function goPage(page) {
    currentPage = page;
    loadVoters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Modal ----
function openNewModal() {
    document.getElementById('modal-title').textContent = 'Nuevo Votante';
    document.getElementById('form-votante').reset();
    document.getElementById('votante-id').value = '';
    document.getElementById('modal-votante').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('votante-nombre').focus(), 300);
}

function editVotante(v) {
    document.getElementById('modal-title').textContent = 'Editar Votante';
    document.getElementById('votante-id').value = v.id;
    document.getElementById('votante-nombre').value = v.nombre;
    document.getElementById('votante-apellido').value = v.apellido;
    document.getElementById('votante-cedula').value = v.cedula;
    document.getElementById('votante-direccion').value = v.direccion || '';
    document.getElementById('votante-barrio').value = v.barrio || '';
    document.getElementById('votante-local').value = v.local_voto || '';
    document.getElementById('votante-celular').value = v.celular || '';
    document.getElementById('votante-correo').value = v.correo || '';
    document.getElementById('modal-votante').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal-votante').classList.remove('active');
    document.body.style.overflow = '';
}

async function saveVotante() {
    const id = document.getElementById('votante-id').value;
    const data = {
        nombre: document.getElementById('votante-nombre').value.trim(),
        apellido: document.getElementById('votante-apellido').value.trim(),
        cedula: document.getElementById('votante-cedula').value.trim(),
        direccion: document.getElementById('votante-direccion').value.trim(),
        barrio: document.getElementById('votante-barrio').value.trim(),
        local_voto: document.getElementById('votante-local').value.trim(),
        celular: document.getElementById('votante-celular').value.trim(),
        correo: document.getElementById('votante-correo').value.trim()
    };

    if (!data.nombre || !data.apellido || !data.cedula) {
        toast('Nombre, Apellido y Cedula son obligatorios', 'error');
        return;
    }

    try {
        if (id) {
            await api(`/api/votantes/${id}`, 'PUT', data);
            toast('Votante actualizado');
        } else {
            await api('/api/votantes', 'POST', data);
            toast('Votante registrado');
        }
        closeModal();
        loadVoters();
        loadStats();
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function deleteVotante(id) {
    if (!confirm('Eliminar este votante?')) return;
    try {
        await api(`/api/votantes/${id}`, 'DELETE');
        toast('Votante eliminado');
        loadVoters();
        loadStats();
    } catch (e) {
        toast(e.message, 'error');
    }
}

// ---- Export ----
function toggleExportMenu() {
    const menu = document.getElementById('export-menu');
    exportMenuOpen = !exportMenuOpen;
    menu.classList.toggle('active', exportMenuOpen);
}

async function exportCSV() {
    toggleExportMenu();
    try {
        let url = '/api/votantes/export';
        if (currentSearch) url += `?search=${encodeURIComponent(currentSearch)}`;
        const data = await api(url);

        if (data.length === 0) { toast('No hay datos para exportar', 'error'); return; }

        const headers = ['Nombre', 'Apellido', 'Cedula', 'Direccion', 'Barrio', 'Local de Voto', 'Celular', 'Correo'];
        const keys = ['nombre', 'apellido', 'cedula', 'direccion', 'barrio', 'local_voto', 'celular', 'correo'];

        let csv = headers.join(',') + '\n';
        data.forEach(row => {
            csv += keys.map(k => `"${(row[k] || '').replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `votantes_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast('CSV descargado exitosamente');
    } catch (e) {
        toast('Error al exportar CSV', 'error');
    }
}

async function exportPDF() {
    toggleExportMenu();
    try {
        let url = '/api/votantes/export';
        if (currentSearch) url += `?search=${encodeURIComponent(currentSearch)}`;
        const data = await api(url);

        if (data.length === 0) { toast('No hay datos para exportar', 'error'); return; }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        // Title
        doc.setFontSize(18);
        doc.setTextColor(59, 130, 246);
        doc.text('Listado de Votantes', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} - Total: ${data.length} registros`, 14, 28);

        // Table
        const headers = [['Nombre', 'Apellido', 'Cedula', 'Direccion', 'Barrio', 'Local Voto', 'Celular', 'Correo']];
        const rows = data.map(r => [
            r.nombre || '', r.apellido || '', r.cedula || '',
            r.direccion || '', r.barrio || '', r.local_voto || '',
            r.celular || '', r.correo || ''
        ]);

        doc.autoTable({
            head: headers,
            body: rows,
            startY: 34,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { top: 34 }
        });

        doc.save(`votantes_${new Date().toISOString().split('T')[0]}.pdf`);
        toast('PDF descargado exitosamente');
    } catch (e) {
        toast('Error al exportar PDF', 'error');
    }
}
