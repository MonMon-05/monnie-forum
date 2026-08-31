// ============================================================
// CONFIG — Replace these with your JSONBin.io credentials
// Sign up at https://jsonbin.io, create a bin, and paste here
// ============================================================
const CONFIG = {
    apiKey: '$2a$10$eO.Jn4FLv0JFSaPV29dC7e1wM4WzWQGkhzj7PLZasxiGYhrxzOE7m',
    diaryBinId: '6a95b16fda38895dfe2712ed',
    boardBinId: '6a95b179f5f4af5e29589fa6',
    adminPassword: 'ILoveAnime!2200'
};
// ============================================================

const API = 'https://api.jsonbin.io/v3';

function headers() {
    return {
        'X-Master-Key': CONFIG.apiKey,
        'Content-Type': 'application/json'
    };
}

async function fetchBin(binId) {
    try {
        const res = await fetch(`${API}/b/${binId}/latest`, { headers: headers() });
        if (!res.ok) {
            console.error('Fetch failed:', res.status, await res.text());
            return [];
        }
        const data = await res.json();
        return data.record || [];
    } catch (e) {
        console.error('Fetch error:', e);
        return [];
    }
}

async function saveBin(binId, data) {
    const res = await fetch(`${API}/b/${binId}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json();
        console.error('Save failed:', err);
        alert('Failed to save. Check console for details.');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ---- Admin ----

function isAdmin() {
    return sessionStorage.getItem('monnie-admin') === 'true';
}

function adminLogin() {
    const pw = prompt('Enter admin password:');
    if (pw === CONFIG.adminPassword) {
        sessionStorage.setItem('monnie-admin', 'true');
        location.reload();
    } else if (pw !== null) {
        alert('Wrong password.');
    }
}

function adminLogout() {
    sessionStorage.removeItem('monnie-admin');
    location.reload();
}

function renderAdminButton() {
    if (isAdmin()) {
        return `<button class="btn btn-secondary btn-sm" onclick="adminLogout()">Log out admin</button>`;
    }
    return `<button class="btn btn-secondary btn-sm" onclick="adminLogin()">Admin</button>`;
}

// ---- Comments (shared by diary & board) ----

async function addComment(postId, section, loadFn) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    if (!text) return;

    const binId = section === 'diary' ? CONFIG.diaryBinId : CONFIG.boardBinId;
    const items = await fetchBin(binId);
    const item = items.find(i => i.id === postId);
    if (!item) return;

    item.comments.push({
        id: Date.now(),
        text,
        author: 'Anonymous',
        date: new Date().toLocaleString()
    });

    await saveBin(binId, items);
    input.value = '';
    loadFn();
}

async function deleteComment(postId, commentId, section, loadFn) {
    if (!isAdmin()) return alert('Admin only.');
    if (!confirm('Delete this comment?')) return;
    const binId = section === 'diary' ? CONFIG.diaryBinId : CONFIG.boardBinId;
    const items = await fetchBin(binId);
    const item = items.find(i => i.id === postId);
    if (!item) return;
    item.comments = item.comments.filter(c => c.id !== commentId);
    await saveBin(binId, items);
    loadFn();
}

function renderComments(postId, comments, section, loadFn) {
    const fnName = loadFn.name;
    if (!comments || comments.length === 0) {
        return `
            <div class="comments-section">
                <h4>Comments</h4>
                <div class="comment-form">
                    <input type="text" id="comment-input-${postId}" placeholder="Write a comment..." onkeypress="if(event.key==='Enter')addComment(${postId},'${section}',${fnName})">
                    <button onclick="addComment(${postId},'${section}',${fnName})">Reply</button>
                </div>
            </div>
        `;
    }

    const commentsHtml = comments.map(c => `
        <div class="comment">
            <div class="comment-header">
                <div class="comment-meta">${escapeHtml(c.author)} &mdash; ${c.date}</div>
                ${isAdmin() ? `<button class="delete-comment-btn" onclick="deleteComment(${postId},${c.id},'${section}',${fnName})">x</button>` : ''}
            </div>
            <div>${escapeHtml(c.text)}</div>
        </div>
    `).join('');

    return `
        <div class="comments-section">
            <h4>Comments (${comments.length})</h4>
            ${commentsHtml}
            <div class="comment-form">
                <input type="text" id="comment-input-${postId}" placeholder="Write a comment..." onkeypress="if(event.key==='Enter')addComment(${postId},'${section}',${fnName})">
                <button onclick="addComment(${postId},'${section}',${fnName})">Reply</button>
            </div>
        </div>
    `;
}

// ---- Home page: recent posts ----

async function loadRecentPosts() {
    const container = document.getElementById('recent-posts-list');
    if (!container) return;

    const diary = await fetchBin(CONFIG.diaryBinId);
    const board = await fetchBin(CONFIG.boardBinId);

    const all = [
        ...diary.map(d => ({ ...d, section: 'Diary' })),
        ...board.map(b => ({ ...b, section: 'Board' }))
    ].sort((a, b) => b.id - a.id).slice(0, 5);

    if (all.length === 0) {
        container.innerHTML = '<p class="empty-state">No posts yet. Be the first to write something.</p>';
        return;
    }

    container.innerHTML = all.map(p => `
        <div class="post-card">
            <h3>${escapeHtml(p.title)}</h3>
            <span class="tag">${escapeHtml(p.section)}</span>
            <p class="post-body">${escapeHtml(p.entry || p.body)}</p>
            <p class="post-meta">${escapeHtml(p.author)} &mdash; ${p.date}</p>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadRecentPosts);
