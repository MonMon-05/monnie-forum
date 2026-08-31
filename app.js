// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
    apiKey: '$2a$10$eO.Jn4FLv0JFSaPV29dC7e1wM4WzWQGkhzj7PLZasxiGYhrxzOE7m',
    diaryBinId: '6a95b16fda38895dfe2712ed',
    boardBinId: '6a95b179f5f4af5e29589fa6',
    usersBinId: '6a95e670da38895dfe27ef2d',
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

// ---- Password Hashing ----

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---- User System ----

function getCurrentUser() {
    const stored = sessionStorage.getItem('monnie-user');
    return stored ? JSON.parse(stored) : null;
}

function setCurrentUser(user) {
    sessionStorage.setItem('monnie-user', JSON.stringify(user));
}

function logoutUser() {
    sessionStorage.removeItem('monnie-user');
    location.reload();
}

async function signup(username, password) {
    if (!username || !password) return alert('Please fill in both fields.');
    if (username.length < 2) return alert('Username must be at least 2 characters.');
    if (password.length < 4) return alert('Password must be at least 4 characters.');

    const users = await fetchBin(CONFIG.usersBinId);
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return alert('That username is already taken.');
    }

    const hashed = await hashPassword(password);
    const newUser = { username, password: hashed, isOwner: false };
    users.push(newUser);
    await saveBin(CONFIG.usersBinId, users);

    setCurrentUser({ username, isOwner: false });
    location.reload();
}

async function loginUser(username, password) {
    if (!username || !password) return alert('Please fill in both fields.');

    const users = await fetchBin(CONFIG.usersBinId);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return alert('User not found.');

    const hashed = await hashPassword(password);
    if (user.password !== hashed && user.password !== password) return alert('Wrong password.');

    setCurrentUser({ username: user.username, isOwner: user.isOwner || false });
    location.reload();
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

// ---- UI Rendering ----

function renderAuthButtons() {
    const user = getCurrentUser();
    if (user) {
        return `
            <span class="user-greeting">Hi, ${escapeHtml(user.username)}</span>
            <button class="btn btn-secondary btn-sm" onclick="logoutUser()">Log out</button>
        `;
    }
    return `
        <button class="btn btn-secondary btn-sm" onclick="openLoginModal()">Log in</button>
        <button class="btn btn-sm" onclick="openSignupModal()">Sign up</button>
    `;
}

function renderAdminButton() {
    if (isAdmin()) {
        return `<button class="btn btn-secondary btn-sm" onclick="adminLogout()">Admin off</button>`;
    }
    return `<button class="btn btn-secondary btn-sm" onclick="adminLogin()">Admin</button>`;
}

function renderAuthModalHTML() {
    return `
    <div class="modal-overlay" id="login-modal">
        <div class="modal">
            <h2>Log in</h2>
            <div class="form-group">
                <label for="login-user">Username</label>
                <input type="text" id="login-user" placeholder="Your username">
            </div>
            <div class="form-group">
                <label for="login-pass">Password</label>
                <input type="password" id="login-pass" placeholder="Your password">
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="closeLoginModal()">Cancel</button>
                <button class="btn" onclick="doLogin()">Log in</button>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="signup-modal">
        <div class="modal">
            <h2>Sign up</h2>
            <div class="form-group">
                <label for="signup-user">Choose a username</label>
                <input type="text" id="signup-user" placeholder="Pick a unique username">
            </div>
            <div class="form-group">
                <label for="signup-pass">Choose a password</label>
                <input type="password" id="signup-pass" placeholder="At least 4 characters">
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="closeSignupModal()">Cancel</button>
                <button class="btn" onclick="doSignup()">Sign up</button>
            </div>
        </div>
    </div>
    `;
}

function openLoginModal() { document.getElementById('login-modal').classList.add('open'); }
function closeLoginModal() { document.getElementById('login-modal').classList.remove('open'); }
function openSignupModal() { document.getElementById('signup-modal').classList.add('open'); }
function closeSignupModal() { document.getElementById('signup-modal').classList.remove('open'); }

async function doLogin() {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    closeLoginModal();
    await loginUser(username, password);
}

async function doSignup() {
    const username = document.getElementById('signup-user').value.trim();
    const password = document.getElementById('signup-pass').value;
    closeSignupModal();
    await signup(username, password);
}

// ---- Comments (shared by diary & board) ----

async function addComment(postId, section, loadFn) {
    const textInput = document.getElementById(`comment-input-${postId}`);
    const text = textInput.value.trim();
    if (!text) return;

    const user = getCurrentUser();
    const name = user ? user.username : 'Anonymous';

    const binId = section === 'diary' ? CONFIG.diaryBinId : CONFIG.boardBinId;
    const items = await fetchBin(binId);
    const item = items.find(i => i.id === postId);
    if (!item) return;

    item.comments.push({
        id: Date.now(),
        text,
        author: name,
        date: new Date().toLocaleString()
    });

    await saveBin(binId, items);
    textInput.value = '';
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
    const user = getCurrentUser();

    const commentInput = user
        ? `<div class="comment-form">
                <span class="comment-as">As ${escapeHtml(user.username)}</span>
                <input type="text" id="comment-input-${postId}" placeholder="Write a comment..." onkeypress="if(event.key==='Enter')addComment(${postId},'${section}',${fnName})">
                <button onclick="addComment(${postId},'${section}',${fnName})">Reply</button>
           </div>`
        : `<div class="comment-form">
                <input type="text" id="comment-input-${postId}" placeholder="Log in to comment..." onkeypress="if(event.key==='Enter')addComment(${postId},'${section}',${fnName})">
                <button onclick="addComment(${postId},'${section}',${fnName})">Reply</button>
           </div>`;

    if (!comments || comments.length === 0) {
        return `
            <div class="comments-section">
                <h4>Comments</h4>
                ${commentInput}
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
            ${commentInput}
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
