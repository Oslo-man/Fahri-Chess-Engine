var moveNumber = 1;

var g_allMoves = [];

// ── MOVE-HISTORY NAVIGATION (⏮◀▶⏭) ─────────────────────────────────────────
// g_boardHistory[0]  = position BEFORE any move (game start)
// g_boardHistory[k]  = position AFTER the k-th move in g_allMoves
// Invariant: g_boardHistory.length === g_allMoves.length + 1, always.
// g_viewIndex is which snapshot is currently displayed; the "live" index is
// always g_boardHistory.length - 1. These are plain array snapshots
// (g_board.slice()) used ONLY for read-only rendering while browsing past
// positions — navigating history NEVER calls MakeMove/UnmakeMove/
// GenerateValidMoves or touches g_toMove/g_board, so it cannot desync or
// corrupt the live engine state the way an earlier approach once did.
var g_boardHistory = [];
var g_viewIndex = 0;
var g_playerWhite = true;
var g_changingFen = false;
var g_analyzing = false;

var g_uiBoard;

// Engine level: 1=Beginner, 2=Training, 3=Serious
var g_engineLevel = 3;

// Engine file per level
var g_engineFiles = {
    1: "js/fahriengine1.js",
    2: "js/fahriengine2.js",
    3: "js/fahriengine.js"
};

// Engine name & sub info per level
var g_engineInfo = {
    1: { name: "Fahri mengajar 1200" },
    2: { name: "Fahri tidak fokus 1900" },
    3: { name: "Fahri serius 2200" }
};

// Board cell size calculated dynamically from screen width
var g_cellSize = 44; // recalculated by RecalcCellSize() once the layout is in the DOM

function RecalcCellSize() {
    var mainContent = document.querySelector('.main-content');
    var evalBar = document.getElementById('evalBarContainer');
    var availW = window.innerWidth - 16;
    var availH = window.innerHeight - 16;

    if (mainContent) {
        var rect = mainContent.getBoundingClientRect();
        if (rect.width > 10)  availW = rect.width;
        if (rect.height > 10) availH = rect.height;
    }

    // board-wrapper now sizes to its natural content (flex: 0 0 auto), so
    // opponent-row/player-panel hug the board directly. Still compute
    // available height by subtracting every OTHER fixed-size row's natural
    // height from the total — this is what determines how large the board
    // itself can grow before it would overflow the screen.
    var chromeSelectors = ['.app-header', '.opponent-row', '.player-panel', '.controls-panel', '.history-nav-row'];
    var chromeH = 0;
    for (var i = 0; i < chromeSelectors.length; i++) {
        var el = document.querySelector(chromeSelectors[i]);
        if (el) chromeH += el.getBoundingClientRect().height;
    }
    availH = availH - chromeH - 12;

    var evalBarW = (evalBar && evalBar.style.display !== 'none') ? 20 : 0;
    availW = availW - evalBarW - 6;

    var size = Math.floor(Math.min(availW, availH) / 8);
    g_cellSize = Math.max(28, Math.min(88, size));
    return g_cellSize;
}

// Mode: 'friendly' or 'challenge'
var g_mode = 'friendly';

// Sound on/off (used by the sound engine below)
var g_soundEnabled = true;

// Currently selected square in UI space ({x,y}, 0-7) or null
var g_selectedSquare = null;

// Legal destination squares (UI space) for the currently selected piece
var g_legalTargets = [];

// True once the current game has ended (checkmate/stalemate)
var g_gameOver = false;

// ── SETTINGS PANEL ────────────────────────────────────────────────────────────
function UIOpenSettings() {
    var modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'flex';
}

function UICloseSettings() {
    var modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';
}

// ── CHANGE LEVEL ──────────────────────────────────────────────────────────────
function UIChangeLevel() {
    var sel = document.getElementById("LevelSelect");
    g_engineLevel = parseInt(sel.value, 10);

    var info = g_engineInfo[g_engineLevel];
    var nameEl = document.getElementById("engineName");
    if (nameEl) nameEl.textContent = info.name;

    if (g_backgroundEngine != null) {
        g_backgroundEngine.terminate();
        g_backgroundEngine = null;
    }
    g_backgroundEngineValid = true;
    ResetEvalEngine();
    UpdateTimeRowVisibility();
    UINewGame();
}

// Waktu per gerakan is only relevant for Level 3, and only in Mode Dengan Alat
function UpdateTimeRowVisibility() {
    var timeRow = document.getElementById('timeRow');
    if (!timeRow) return;
    var show = (g_mode === 'friendly') && (g_engineLevel === 3);
    timeRow.style.display = show ? 'flex' : 'none';
}

// ── CHANGE MODE (called from dropdown) ───────────────────────────────────────
function UISetModeFromSelect() {
    var sel = document.getElementById("ModeSelect");
    UISetMode(sel.value);
}

// ── CHANGE MODE ───────────────────────────────────────────────────────────────
function UISetMode(mode) {
    if (!confirm("Apakah Anda yakin?")) {
        // Revert select to current mode if user cancels
        var sel = document.getElementById("ModeSelect");
        if (sel) sel.value = g_mode;
        return;
    }

    g_mode = mode;

    // Sync dropdown in case called programmatically
    var sel = document.getElementById("ModeSelect");
    if (sel) sel.value = mode;

    var btnUndo      = document.getElementById('btnUndo');
    var statusSection = document.getElementById('statusSection');
    var fenSection   = document.getElementById('fenSection');
    var evalBar      = document.getElementById('evalBarContainer');

    var show = (mode === 'friendly');
    if (btnUndo)    btnUndo.style.display    = show ? 'flex' : 'none';
    if (statusSection) statusSection.style.display = show ? 'block' : 'none';
    if (fenSection) fenSection.style.display = show ? 'block' : 'none';
    if (evalBar)    evalBar.style.display    = show ? 'flex' : 'none';
    UpdateTimeRowVisibility();

    if (mode === 'challenge') {
        document.body.classList.add('mode-challenge');
    } else {
        document.body.classList.remove('mode-challenge');
    }

    if (mode === 'challenge' && g_analyzing) {
        UIAnalyzeToggle();
    }

    UINewGame();
}

// ── NEW GAME (from button, with confirmation) ─────────────────────────────────
function UINewGameConfirm() {
    if (!confirm("Apakah Anda yakin?")) return;
    UINewGame();
}

// ── NEW GAME (internal, no confirmation) ──────────────────────────────────────
function UINewGame() {
    PreloadChessSounds();
    moveNumber = 1;
    g_selectedSquare = null;
    g_legalTargets = [];
    g_gameOver = false;
    UICloseGameOverDialog();

    var pgnTextBox = document.getElementById("PgnTextBox");
    pgnTextBox.value = "";

    EnsureAnalysisStopped();
    ResetGame();
    if (InitializeBackgroundEngine()) {
        g_backgroundEngine.postMessage("go");
    }
    g_allMoves = [];
    g_boardHistory = [g_board.slice()];
    g_viewIndex = 0;
    RedrawBoard();
    UpdateEvalBar(0);
    RefreshEvalBar();
    UpdateControlVisibility();
    UpdateHistoryNavButtons();

    if (!g_playerWhite) {
        SearchAndRedraw();
    }
}

function EnsureAnalysisStopped() {
    if (g_analyzing && g_backgroundEngine != null) {
        g_backgroundEngine.terminate();
        g_backgroundEngine = null;
    }
}

function UIAnalyzeToggle() {
    if (InitializeBackgroundEngine()) {
        if (!g_analyzing) {
            g_backgroundEngine.postMessage("analyze");
        } else {
            EnsureAnalysisStopped();
        }
        g_analyzing = !g_analyzing;
        var btn = document.getElementById("AnalysisToggleLink");
        if (btn) btn.classList.toggle('active', g_analyzing);
    } else {
        alert("Peramban Anda harus mendukung web workers untuk analisis - (chrome4, ff4, safari)");
    }
}

function UIChangeFEN() {
    if (!g_changingFen) {
        var fenTextBox = document.getElementById("FenTextBox");
        var result = InitializeFromFen(fenTextBox.value);
        if (result.length != 0) {
            UpdatePVDisplay(result);
            return;
        } else {
            UpdatePVDisplay('');
        }
        g_allMoves = [];
        g_selectedSquare = null;
        g_legalTargets = [];

        EnsureAnalysisStopped();
        InitializeBackgroundEngine();

        g_playerWhite = !!g_toMove;
        g_backgroundEngine.postMessage("position " + GetFen());

        g_boardHistory = [g_board.slice()];
        g_viewIndex = 0;

        RedrawBoard();
        RefreshEvalBar();
        UpdateHistoryNavButtons();
    }
}

function UIChangeStartPlayer() {
    g_playerWhite = !g_playerWhite;
    UINewGame();
}

function UpdatePgnTextBox(move) {
    var pgnTextBox = document.getElementById("PgnTextBox");
    if (g_toMove != 0) {
        pgnTextBox.value += moveNumber + ". ";
        moveNumber++;
    }
    pgnTextBox.value += GetMoveSAN(move) + " ";
}

function UIChangeTimePerMove() {
    var timePerMove = document.getElementById("TimePerMove");
    g_timeout = parseInt(timePerMove.value, 10);
}

function FinishMove(bestMove, value, timeTaken, ply) {
    if (bestMove != null) {
        UIPlayMove(bestMove, BuildPVMessage(bestMove, value, timeTaken, ply));
    } else {
        alert("Magnus aja umur 13 tahun udah jadi GM, sedangkan kamu masih kalah sama Fahri, ya haha.");
    }
}

function UIPlayMove(move, pv) {
    // Capture piece/board info BEFORE the move is applied (needed for sound)
    var fromX = (move & 0xF) - 4;
    var fromY = ((move >> 4) & 0xF) - 2;
    var toX   = ((move >> 8) & 0xF) - 4;
    var toY   = ((move >> 12) & 0xF) - 2;
    var movingPiece   = g_board[MakeSquare(fromY, fromX)];
    var capturedPiece = g_board[MakeSquare(toY, toX)];
    var isEP = !!(move & moveflagEPC);

    UpdatePgnTextBox(move);
    g_allMoves[g_allMoves.length] = move;
    MakeMove(move);
    g_boardHistory.push(g_board.slice());
    g_viewIndex = g_boardHistory.length - 1;
    UpdatePVDisplay(pv);
    UpdateFromMove(move);

    PlayMoveSoundForMove(move, movingPiece, capturedPiece, isEP);
    RefreshEvalBar();
    CheckGameOver();
    UpdateHistoryNavButtons();
}

function UIUndoMove() {
    if (g_allMoves.length == 0) return;

    if (g_backgroundEngine != null) {
        g_backgroundEngine.terminate();
        g_backgroundEngine = null;
    }

    UnmakeMove(g_allMoves[g_allMoves.length - 1]);
    g_allMoves.pop();
    g_boardHistory.pop();

    if (g_playerWhite != !!g_toMove && g_allMoves.length != 0) {
        UnmakeMove(g_allMoves[g_allMoves.length - 1]);
        g_allMoves.pop();
        g_boardHistory.pop();
    }

    g_viewIndex = g_boardHistory.length - 1;
    g_selectedSquare = null;
    g_legalTargets = [];
    g_gameOver = false;
    UICloseGameOverDialog();
    RedrawBoard();
    RefreshEvalBar();
    UpdateControlVisibility();
    UpdateHistoryNavButtons();
}
var g_evalEngine = null;
var g_evalEngineValid = true;

function RefreshEvalBar() {
    // Always fully tear down and recreate — a worker mid-"analyze" does not
    // reliably accept a fresh "position" (the same limitation the main
    // engine has, which is why SearchAndRedraw() restarts g_backgroundEngine
    // every time instead of repositioning a live worker).
    if (g_evalEngine != null) {
        try { g_evalEngine.terminate(); } catch (e) { /* ignore */ }
        g_evalEngine = null;
    }
    g_evalEngineValid = true;

    try {
        g_evalEngine = new Worker(g_engineFiles[g_engineLevel]);
        g_evalEngine.onmessage = function (e) {
            var text = e.data;
            if (typeof text !== 'string') return;
            var match = text.match(/Score:(-?\d+)/);
            if (match) {
                var score = parseInt(match[1], 10);
                if (g_toMove === 0) score = -score;
                UpdateEvalBar(score);
            }
        };
        g_evalEngine.onerror = function () { g_evalEngineValid = false; };
        g_evalEngine.postMessage("position " + GetFen());
        g_evalEngine.postMessage("analyze");
    } catch (err) {
        g_evalEngineValid = false;
        g_evalEngine = null;
    }
}

function ResetEvalEngine() {
    if (g_evalEngine != null) {
        try { g_evalEngine.terminate(); } catch (e) { /* ignore */ }
        g_evalEngine = null;
    }
    g_evalEngineValid = true;
}

// ── GAME OVER DETECTION / DIALOG / BUTTON VISIBILITY ───────────────────────────
// Runs after every applied move. Reliable because it checks the actual legal
// move list ourselves, rather than depending on undocumented engine message
// formats.
function CheckGameOver() {
    if (g_gameOver) return true;

    var moves = GenerateValidMoves();
    if (moves.length > 0) return false;

    // No legal moves for the side to move: game has ended.
    var sideToMoveIsPlayer = IsPlayersTurn();

    // Distinguish checkmate (decisive) from stalemate (draw) using the
    // self-contained, side-effect-free IsSideInCheckNow() detector.
    var inCheck = true;
    try {
        inCheck = IsSideInCheckNow(!!g_toMove);
    } catch (e) {
        inCheck = true; // keep original decisive-by-default assumption
    }

    g_gameOver = true;
    EnsureAnalysisStopped();
    UpdateControlVisibility();

    if (!inCheck) {
        ShowGameOverDialog('draw');
    } else if (sideToMoveIsPlayer) {
        ShowGameOverDialog('loss');
    } else {
        ShowGameOverDialog('win');
    }
    return true;
}

function ShowGameOverDialog(result) {
    var modal = document.getElementById('gameOverModal');
    var msgEl = document.getElementById('gameOverMessage');
    if (!modal || !msgEl) return;

    var msg;
    if (result === 'win') msg = 'Kamu mengalahkan Fahri!';
    else if (result === 'draw') msg = 'Kamu berhasil bertahan melawan Fahri!';
    else msg = 'haha masih bisa kalah sama Fahri!';

    msgEl.textContent = msg;
    modal.style.display = 'flex';
}

function UICloseGameOverDialog() {
    var modal = document.getElementById('gameOverModal');
    if (modal) modal.style.display = 'none';
}

// "Permainan Baru" button inside the game-over dialog
function UIGameOverNewGame() {
    UICloseGameOverDialog();
    UINewGame();
}

// "Tunggu" button inside the game-over dialog — stay on the final position
function UIGameOverWait() {
    UICloseGameOverDialog();
    UpdateControlVisibility();
}

// Both the "Permainan Baru" and "Menyerah" icon buttons call this. Once the
// game has already ended there's nothing to confirm, so it resets straight
// away; during an active game it still asks for confirmation first.
function UIResetOrSurrender() {
    if (g_gameOver) {
        UINewGame();
    } else {
        UINewGameConfirm();
    }
}

// Shows/hides the New Game vs Surrender icon buttons depending on mode and
// whether the game has ended.
function UpdateControlVisibility() {
    var btnNew    = document.getElementById('btnNewGame');
    var btnResign = document.getElementById('btnResign');
    if (!btnNew || !btnResign) return;

    if (g_gameOver) {
        btnNew.style.display    = 'flex';
        btnResign.style.display = 'none';
    } else {
        btnResign.style.display = 'flex';
        btnNew.style.display    = (g_mode === 'challenge') ? 'none' : 'flex';
    }
}

// ── EVALUATION BAR ───────────────────────────────────────────────────────────
function UpdateEvalBar(scoreInternal) {
    var barBlack = document.getElementById('evalBarBlack');
    var barWhite = document.getElementById('evalBarWhite');
    var label    = document.getElementById('evalBarLabel');
    if (!barBlack || !barWhite) return;

    var whitePct, displayPawn;

    // Mate score threshold (internal units: minEval+2000 / maxEval-2000 ≈ ±1,998,000)
    var MATE_THRESHOLD = 1900000;

    if (Math.abs(scoreInternal) >= MATE_THRESHOLD) {
        // Forced mate detected — push bar to near-total (Chess.com style: leave a 3% sliver)
        whitePct = scoreInternal > 0 ? 99 : 1;
        displayPawn = scoreInternal > 0 ? 99.9 : -99.9;
    } else {
        var cp = scoreInternal / 8; // internal units → centipawns (1 pawn ≈ 100 cp)

        // Sigmoid mapping: tanh gives natural S-curve identical to Chess.com feel.
        // 650 cp constant: ±300 cp ≈ 63/37, ±600 cp ≈ 76/24, ±1200 cp ≈ 88/12
        whitePct = 50 * (1 + Math.tanh(cp / 650));

        // Hard clamp: always show a tiny sliver on each side (Chess.com leaves ~3%)
        whitePct    = Math.max(3, Math.min(97, whitePct));
        displayPawn = Math.max(-99.9, Math.min(99.9, cp / 100));
    }

    var blackPct = 100 - whitePct;
    barBlack.style.height = blackPct.toFixed(1) + '%';
    barWhite.style.height = whitePct.toFixed(1) + '%';

    var sign = displayPawn >= 0 ? '+' : '';
    label.textContent = sign + displayPawn.toFixed(1);
}

function UpdatePVDisplay(pv) {
    if (pv != null) {
        var outputDiv = document.getElementById("output");
        if (outputDiv.firstChild != null) {
            outputDiv.removeChild(outputDiv.firstChild);
        }
        outputDiv.appendChild(document.createTextNode(pv));
    }
}

function SearchAndRedraw() {
    if (g_analyzing) {
        EnsureAnalysisStopped();
        InitializeBackgroundEngine();
        g_backgroundEngine.postMessage("position " + GetFen());
        g_backgroundEngine.postMessage("analyze");
        return;
    }

    if (InitializeBackgroundEngine()) {
        g_backgroundEngine.postMessage("search " + g_timeout);
    } else {
        Search(FinishMove, 99, null);
    }
}

var g_backgroundEngineValid = true;
var g_backgroundEngine;

function InitializeBackgroundEngine() {
    if (!g_backgroundEngineValid) return false;

    if (g_backgroundEngine == null) {
        g_backgroundEngineValid = true;
        try {
            g_backgroundEngine = new Worker(g_engineFiles[g_engineLevel]);
            g_backgroundEngine.onmessage = function (e) {
                if (e.data.match("^pv") == "pv") {
                    UpdatePVDisplay(e.data.substr(3, e.data.length - 3));
                } else if (e.data.match("^message") == "message") {
                    EnsureAnalysisStopped();
                    UpdatePVDisplay(e.data.substr(8, e.data.length - 8));
                } else {
                    UIPlayMove(GetMoveFromString(e.data), null);
                }
            }
            g_backgroundEngine.error = function (e) {
                alert("Kesalahan dari background worker:" + e.message);
            }
            g_backgroundEngine.postMessage("position " + GetFen());
        } catch (error) {
            g_backgroundEngineValid = false;
        }
    }

    return g_backgroundEngineValid;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUND ENGINE (Web Audio API) — ported from puzzles.html, piece-agnostic
// engine logic, only wired up via PlayMoveSoundForMove() above.
// ═══════════════════════════════════════════════════════════════════════════
        // =====================================================
        // PIECE SVG DEFINITIONS (Wikimedia Commons Style)
        // =====================================================
        const PIECE_SVG = {
            'wK': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#fff" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#fff" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"/><path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/></g></svg>`,
            'wQ': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L6 14l3 12z"/><path stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>`,
            'wR': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/><path d="M34 14l-3 3H14l-3-3"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M31 17v12.5H14V17"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path fill="none" stroke-linejoin="miter" d="M11 14h23"/></g></svg>`,
            'wB': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>`,
            'wN': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#fff" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><path fill="#000" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zM14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"/></g></svg>`,
            'wP': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
            'bK': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#000" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"/><path stroke="#fff" stroke-width="1.5" d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/><path fill="none" stroke="#fff" stroke-width="1" d="M20.5 25s3-5 2.5-8.5M24.5 25s-3-5-2.5-8.5"/></g></svg>`,
            'bQ': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path fill="#000" stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/><path fill="#000" stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" stroke="#fff" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>`,
            'bR': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" stroke-linecap="butt" d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M14 29.5v-13h17v13H14z"/><path fill="#000" stroke-linecap="butt" d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/><path fill="none" stroke="#fff" stroke-linejoin="miter" stroke-width="1" d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23"/></g></svg>`,
            'bB': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke="#fff" stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>`,
            'bN': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" stroke="#333" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#000" stroke="#333" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><circle cx="9" cy="25.5" r="1.5" fill="#fff"/><ellipse cx="14.5" cy="15.5" rx="1.5" ry="3" fill="#fff" transform="rotate(30 14.5 15.5)"/><path fill="none" stroke="#555" stroke-width="1" d="M25 10.5c4 1 7 3 9 7M27 14c2 1 4 3 5 6"/></g></svg>`,
            'bP': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#333" stroke-width="1.5" stroke-linecap="round"/></svg>`
        };


// ═══════════════════════════════════════════════════════════════════════════
// SOUND ENGINE — plain mp3 playback (chess.com style), files loaded from the
// "sound/" folder next to Chess.html:
//   sound/move-self.mp3   → normal move
//   sound/capture.mp3     → capture
//   sound/move-check.mp3  → move that gives check
//   sound/castle.mp3      → castling (kingside or queenside)
//   sound/promote.mp3     → pawn promotion
// ═══════════════════════════════════════════════════════════════════════════

var SOUND_FILES = {
    move:    'sound/move-self.mp3',
    capture: 'sound/capture.mp3',
    check:   'sound/move-check.mp3',
    castle:  'sound/castle.mp3',
    promote: 'sound/promote.mp3'
};

// Preloaded <audio> elements, one per sound type — used as the "master" copy
// that gets cloned on every play so overlapping moves never cut each other off.
var g_soundElements = {};
var g_soundsPreloaded = false;

function PreloadChessSounds() {
    if (g_soundsPreloaded) return;
    g_soundsPreloaded = true;
    for (var key in SOUND_FILES) {
        try {
            var audio = new Audio(SOUND_FILES[key]);
            audio.preload = 'auto';
            g_soundElements[key] = audio;
        } catch (e) {
            // Audio element creation failing shouldn't break the game
            console.warn('PreloadChessSounds failed for', key, e);
        }
    }
}

// Plays one of the sound types above. Clones the preloaded element so rapid
// successive moves (e.g. player move immediately followed by Fahri's reply)
// don't cut each other's sound off.
function PlayChessSoundFile(type) {
    if (!g_soundEnabled) return;
    var src = SOUND_FILES[type];
    if (!src) return;

    try {
        var base = g_soundElements[type];
        var node = base ? base.cloneNode(true) : new Audio(src);
        node.volume = 1.0;
        var playPromise = node.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(function () {
                // Playback can be blocked before the very first user
                // gesture on the page — safe to ignore.
            });
        }
    } catch (e) {
        console.warn('PlayChessSoundFile failed:', e);
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// PIECE / SQUARE HELPERS (bridge between fahriengine.js's board format
// and the SVG piece set + sound engine below)
// ═══════════════════════════════════════════════════════════════════════════

// Is it currently the human player's turn to move?
function IsPlayersTurn() {
    return !((g_playerWhite && g_toMove === 0) || (!g_playerWhite && g_toMove !== 0));
}

// Raw piece value at a UI-space square (0-7,0-7), respecting board orientation
function GetPieceAtUI(uiX, uiY) {
    var ix = g_playerWhite ? uiX : 7 - uiX;
    var iy = g_playerWhite ? uiY : 7 - uiY;
    return g_board[((iy + 2) * 0x10) + ix + 4];
}

// "wK"/"bP"/... key into PIECE_SVG for a raw piece value
function GetPieceSvgKey(piece) {
    if (!piece) return null;
    var t;
    switch (piece & 0x7) {
        case piecePawn:   t = 'P'; break;
        case pieceKnight: t = 'N'; break;
        case pieceBishop: t = 'B'; break;
        case pieceRook:   t = 'R'; break;
        case pieceQueen:  t = 'Q'; break;
        case pieceKing:   t = 'K'; break;
        default: return null;
    }
    return ((piece & 0x8) ? 'w' : 'b') + t;
}

// 'p'/'n'/'b'/'r'/'q'/'k' letter used by the sound engine
function GetPieceSoundLetter(piece) {
    if (!piece) return null;
    switch (piece & 0x7) {
        case piecePawn:   return 'p';
        case pieceKnight: return 'n';
        case pieceBishop: return 'b';
        case pieceRook:   return 'r';
        case pieceQueen:  return 'q';
        case pieceKing:   return 'k';
    }
    return null;
}

// Convert fahriengine's internal (x,y) move coordinates to algebraic notation
function SquareToAlgebraic(x, y) {
    return 'abcdefgh'[x] + (8 - y);
}

function ClearSelectionHighlight() {
    if (!g_uiBoard) return;
    for (var i = 0; i < g_uiBoard.length; i++) {
        if (g_uiBoard[i]) g_uiBoard[i].classList.remove('selected');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUND HOOK — bridges a fahriengine move int to PlayChessSoundFile()
// ═══════════════════════════════════════════════════════════════════════════

// Finds the (y,x) square — internal engine coordinates, NOT UI-rotated —
// of the king belonging to the given side (true = white, matching the
// (piece & 0x8) !== 0 encoding used everywhere else in this file).
// Pure read of g_board only.
function FindKingSquare(sideIsWhite) {
    for (var y = 0; y < 8; y++) {
        for (var x = 0; x < 8; x++) {
            var p = g_board[MakeSquare(y, x)];
            if (p && (p & 0x7) === pieceKing && ((p & 0x8) !== 0) === sideIsWhite) {
                return { y: y, x: x };
            }
        }
    }
    return null;
}

// Returns true if the square (targetY,targetX) — internal engine
// coordinates — is attacked by any piece belonging to the given color.
// This is a completely self-contained, manual attack scan: it only ever
// READS g_board (via MakeSquare, a pure index formula) and never calls
// GenerateValidMoves(), MakeMove(), or touches g_toMove — so unlike an
// earlier "null-move" approach, it cannot corrupt any internal fahriengine
// state (that earlier approach was the cause of the freeze/undo-corruption
// bug: flipping g_toMove and calling GenerateValidMoves() outside of the
// engine's own move sequence desynced its internal bookkeeping).
//
// Board orientation note: internal y=0 is rank 8 (Black's home rank) and
// y=7 is rank 1 (White's home rank) — this matches GetPieceAtUI(), where
// UI row 0 (top of the board on screen, playing as White) maps directly to
// internal y=0. So White pawns advance toward DECREASING y, Black pawns
// toward INCREASING y.
function IsSquareAttacked(targetY, targetX, byWhite) {
    // Knight attacks
    var knightDeltas = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (var i = 0; i < knightDeltas.length; i++) {
        var ny = targetY + knightDeltas[i][0], nx = targetX + knightDeltas[i][1];
        if (ny < 0 || ny > 7 || nx < 0 || nx > 7) continue;
        var np = g_board[MakeSquare(ny, nx)];
        if (np && (np & 0x7) === pieceKnight && ((np & 0x8) !== 0) === byWhite) return true;
    }

    // King attacks (adjacent squares) — needed so two kings can never be
    // placed adjacent, and to detect a king "attacking" for completeness.
    for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
            if (dy === 0 && dx === 0) continue;
            var ky = targetY + dy, kx = targetX + dx;
            if (ky < 0 || ky > 7 || kx < 0 || kx > 7) continue;
            var kp = g_board[MakeSquare(ky, kx)];
            if (kp && (kp & 0x7) === pieceKing && ((kp & 0x8) !== 0) === byWhite) return true;
        }
    }

    // Pawn attacks: a byWhite pawn attacking (targetY,targetX) sits one
    // rank "behind" it from that pawn's own advancing direction.
    var pawnY = byWhite ? targetY + 1 : targetY - 1;
    if (pawnY >= 0 && pawnY <= 7) {
        for (var pdx = -1; pdx <= 1; pdx += 2) {
            var pawnX = targetX + pdx;
            if (pawnX < 0 || pawnX > 7) continue;
            var pp = g_board[MakeSquare(pawnY, pawnX)];
            if (pp && (pp & 0x7) === piecePawn && ((pp & 0x8) !== 0) === byWhite) return true;
        }
    }

    // Sliding pieces — orthogonal (rook/queen)
    var orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var od = 0; od < orthoDirs.length; od++) {
        var oy = targetY + orthoDirs[od][0], ox = targetX + orthoDirs[od][1];
        while (oy >= 0 && oy <= 7 && ox >= 0 && ox <= 7) {
            var op = g_board[MakeSquare(oy, ox)];
            if (op) {
                var otype = op & 0x7;
                if (((op & 0x8) !== 0) === byWhite && (otype === pieceRook || otype === pieceQueen)) return true;
                break; // blocked by any piece, friend or foe
            }
            oy += orthoDirs[od][0];
            ox += orthoDirs[od][1];
        }
    }

    // Sliding pieces — diagonal (bishop/queen)
    var diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (var dd = 0; dd < diagDirs.length; dd++) {
        var diy = targetY + diagDirs[dd][0], dix = targetX + diagDirs[dd][1];
        while (diy >= 0 && diy <= 7 && dix >= 0 && dix <= 7) {
            var dp = g_board[MakeSquare(diy, dix)];
            if (dp) {
                var dtype = dp & 0x7;
                if (((dp & 0x8) !== 0) === byWhite && (dtype === pieceBishop || dtype === pieceQueen)) return true;
                break;
            }
            diy += diagDirs[dd][0];
            dix += diagDirs[dd][1];
        }
    }

    return false;
}

// Self-contained, engine-agnostic "is this side currently in check?" test.
// Pure and side-effect-free — safe to call at any time, as often as needed.
function IsSideInCheckNow(sideIsWhite) {
    var kingPos = FindKingSquare(sideIsWhite);
    if (!kingPos) return false;
    return IsSquareAttacked(kingPos.y, kingPos.x, !sideIsWhite);
}

// Chooses which mp3 to play for a just-applied move, chess.com style.
// Priority: castling > promotion > check > capture > plain move.
// Called AFTER MakeMove(move), so g_toMove already reflects the side that
// must respond next — checking that side for "in check" tells us whether
// the move we just played gives check.
function PlayMoveSoundForMove(move, movingPieceRaw, capturedPieceRaw, isEP) {
    var isCastle    = !!(move & (moveflagCastleKing | moveflagCastleQueen));
    var isPromotion = !!(move & moveflagPromotion);
    var isCapture   = !!(capturedPieceRaw || isEP);

    var givesCheck = false;
    try {
        givesCheck = IsSideInCheckNow(!!g_toMove);
    } catch (e) {
        givesCheck = false;
    }

    var soundType;
    if (isCastle) {
        soundType = 'castle';
    } else if (isPromotion) {
        soundType = 'promote';
    } else if (givesCheck) {
        soundType = 'check';
    } else if (isCapture) {
        soundType = 'capture';
    } else {
        soundType = 'move';
    }

    try {
        PlayChessSoundFile(soundType);
    } catch (e) {
        // Sound is a nice-to-have; never let it break the game
        console.warn('PlayChessSoundFile failed:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE EXECUTION — same validation/apply logic the original dropPiece used,
// just refactored to take explicit UI-space {x,y} squares.
// ═══════════════════════════════════════════════════════════════════════════

function TryMakeMove(fromUI, toUI) {
    var fromX = fromUI.x, fromY = fromUI.y, toX = toUI.x, toY = toUI.y;
    if (!g_playerWhite) {
        fromX = 7 - fromX; fromY = 7 - fromY;
        toX   = 7 - toX;   toY   = 7 - toY;
    }

    var moves = GenerateValidMoves();
    var move = null;
    for (var i = 0; i < moves.length; i++) {
        if ((moves[i] & 0xFF) === MakeSquare(fromY, fromX) &&
            ((moves[i] >> 8) & 0xFF) === MakeSquare(toY, toX)) {
            move = moves[i];
        }
    }
    if (move == null) return false;

    var movingPiece   = g_board[MakeSquare(fromY, fromX)];
    var capturedPiece = g_board[MakeSquare(toY, toX)];
    var isEP = !!(move & moveflagEPC);

    UpdatePgnTextBox(move);
    if (InitializeBackgroundEngine()) {
        g_backgroundEngine.postMessage(FormatMove(move));
    }
    g_allMoves[g_allMoves.length] = move;
    MakeMove(move);
    g_boardHistory.push(g_board.slice());
    g_viewIndex = g_boardHistory.length - 1;
    UpdateFromMove(move);

    PlayMoveSoundForMove(move, movingPiece, capturedPiece, isEP);
    RefreshEvalBar();
    UpdateHistoryNavButtons();

    var fenBox = document.getElementById("FenTextBox");
    if (fenBox) fenBox.value = GetFen();

    if (!CheckGameOver()) {
        setTimeout("SearchAndRedraw()", 0);
    }

    return true;
}

// All legal destination squares (UI-space) for the piece sitting on fromUI
function GetLegalTargetsForSquare(fromUI) {
    var fromX = fromUI.x, fromY = fromUI.y;
    if (!g_playerWhite) { fromX = 7 - fromX; fromY = 7 - fromY; }

    var fromSq = MakeSquare(fromY, fromX);
    var moves = GenerateValidMoves();
    var targets = [];
    var seen = {};

    for (var i = 0; i < moves.length; i++) {
        if ((moves[i] & 0xFF) !== fromSq) continue;
        var toSq = (moves[i] >> 8) & 0xFF;
        var toX = (toSq & 0xF) - 4;
        var toY = ((toSq >> 4) & 0xF) - 2;
        var uiX = toX, uiY = toY;
        if (!g_playerWhite) { uiX = 7 - uiX; uiY = 7 - uiY; }
        var key = uiX + ',' + uiY;
        if (!seen[key]) {
            seen[key] = true;
            targets.push({ x: uiX, y: uiY });
        }
    }
    return targets;
}

// ═══════════════════════════════════════════════════════════════════════════
// SELECTION STATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function SetSelection(uiX, uiY) {
    g_selectedSquare = { x: uiX, y: uiY };
    g_legalTargets = GetLegalTargetsForSquare(g_selectedSquare);
    RedrawPieces();
}

function ClearSelection() {
    g_selectedSquare = null;
    g_legalTargets = [];
    RedrawPieces();
}

// ═══════════════════════════════════════════════════════════════════════════
// GHOST PIECE (floating SVG that follows the cursor / finger while dragging)
// ═══════════════════════════════════════════════════════════════════════════

function CreateGhostPiece(pieceKey, clientX, clientY, isTouch) {
    var el = document.createElement('div');
    el.className = 'piece-ghost';
    el.innerHTML = PIECE_SVG[pieceKey];
    var size = Math.round(g_cellSize * 1.18);
    el.style.width  = size + 'px';
    el.style.height = size + 'px';
    el.style.left = clientX + 'px';
    el.style.top  = clientY + 'px';
    if (isTouch) el.style.transform = 'translate(-50%,-135%)';
    document.body.appendChild(el);
    return el;
}

// ═══════════════════════════════════════════════════════════════════════════
// POINTER-BASED DRAG & DROP (unified mouse + touch + pen, chess.com/lichess
// style: press to lift & select with move-dots, drag to follow, drop to move)
// ═══════════════════════════════════════════════════════════════════════════

var g_activeDrag = null; // non-null while a press/drag interaction is in progress

function OnSquarePointerDown(e, uiX, uiY) {
    if (!IsAtLivePosition()) return; // read-only while reviewing past moves
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (g_activeDrag) return; // ignore a second simultaneous pointer

    var piece = GetPieceAtUI(uiX, uiY);
    var isOwn = piece && (((piece & 0x8) !== 0) === g_playerWhite);

    // Pressing the already-selected piece again — allow re-drag; a plain
    // release-in-place (no movement) will toggle the selection off.
    if (g_selectedSquare && g_selectedSquare.x === uiX && g_selectedSquare.y === uiY) {
        if (isOwn && IsPlayersTurn()) {
            StartDrag(e, uiX, uiY, piece, true);
        }
        return;
    }

    // Something else is selected — try moving there first
    if (g_selectedSquare) {
        var from = g_selectedSquare;
        var didMove = TryMakeMove(from, { x: uiX, y: uiY });
        if (didMove) { ClearSelection(); return; }

        if (isOwn && IsPlayersTurn()) {
            SetSelection(uiX, uiY);
            StartDrag(e, uiX, uiY, piece, false);
        } else {
            ClearSelection();
        }
        return;
    }

    // Nothing selected yet — select this piece if it's ours
    if (isOwn && IsPlayersTurn()) {
        SetSelection(uiX, uiY);
        StartDrag(e, uiX, uiY, piece, false);
    }
}

function StartDrag(e, uiX, uiY, piece, wasAlreadySelected) {
    var pieceKey = GetPieceSvgKey(piece);
    var isTouch = (e.pointerType === 'touch' || e.pointerType === 'pen');
    var td = g_uiBoard[uiY * 8 + uiX];
    var pieceDivEl = td ? td.querySelector('.chess-piece') : null;
    var pointerId = e.pointerId;

    var startX = e.clientX, startY = e.clientY;
    var moved = false;
    var ghostEl = null;

    g_activeDrag = { pointerId: pointerId };

    function ensureGhost(x, y) {
        if (!ghostEl) {
            if (pieceDivEl) pieceDivEl.classList.add('is-dragging-source');
            ghostEl = CreateGhostPiece(pieceKey, x, y, isTouch);
        } else {
            ghostEl.style.left = x + 'px';
            ghostEl.style.top  = y + 'px';
        }
    }

    function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        var dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!moved && (dx * dx + dy * dy) < 9) return; // ~3px dead-zone, avoids flicker on plain taps
        moved = true;
        ensureGhost(ev.clientX, ev.clientY);
    }

    function cleanup() {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onCancel);
        if (ghostEl) { ghostEl.remove(); ghostEl = null; }
        if (pieceDivEl) pieceDivEl.classList.remove('is-dragging-source');
        g_activeDrag = null;
    }

    function onUp(ev) {
        if (ev.pointerId !== pointerId) return;
        cleanup();

        var targetEl = document.elementFromPoint(ev.clientX, ev.clientY);
        var squareTd = targetEl ? targetEl.closest('.board-td') : null;

        if (!squareTd) {
            RedrawPieces();
            return;
        }

        var tx = parseInt(squareTd.dataset.uiX, 10);
        var ty = parseInt(squareTd.dataset.uiY, 10);

        if (tx === uiX && ty === uiY) {
            if (!moved && wasAlreadySelected) {
                ClearSelection(); // plain second tap on the same piece -> deselect
            } else {
                RedrawPieces(); // keep current selection + dots
            }
            return;
        }

        var didMove = TryMakeMove({ x: uiX, y: uiY }, { x: tx, y: ty });
        if (didMove) {
            ClearSelection();
            return;
        }

        var destPiece = GetPieceAtUI(tx, ty);
        if (destPiece && ((destPiece & 0x8) !== 0) === g_playerWhite) {
            SetSelection(tx, ty);
        } else {
            ClearSelection();
        }
    }

    function onCancel(ev) {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        RedrawPieces();
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
}

// ═══════════════════════════════════════════════════════════════════════════
// BOARD RENDERING (board squares themselves are untouched — only piece
// rendering + interaction wiring changes here)
// ═══════════════════════════════════════════════════════════════════════════

function UpdateFromMove(move) {
    ClearSelectionHighlight();

    var fromX = (move & 0xF) - 4;
    var fromY = ((move >> 4) & 0xF) - 2;
    var toX = ((move >> 8) & 0xF) - 4;
    var toY = ((move >> 12) & 0xF) - 2;

    if (!g_playerWhite) {
        fromY = 7 - fromY;
        toY = 7 - toY;
        fromX = 7 - fromX;
        toX = 7 - toX;
    }

    if ((move & moveflagCastleKing) ||
        (move & moveflagCastleQueen) ||
        (move & moveflagEPC) ||
        (move & moveflagPromotion)) {
        RedrawPieces();
    } else {
        var fromSquare = g_uiBoard[fromY * 8 + fromX];
        var toSquare = g_uiBoard[toY * 8 + toX];
        toSquare.innerHTML = '';
        while (fromSquare.firstChild) {
            toSquare.appendChild(fromSquare.firstChild);
        }
    }
}

function RedrawPieces() {
    for (var y = 0; y < 8; ++y) {
        for (var x = 0; x < 8; ++x) {
            var td = g_uiBoard[y * 8 + x];
            td.innerHTML = '';
            td.classList.remove('selected');

            var pieceY = g_playerWhite ? y : 7 - y;
            var pieceX = g_playerWhite ? x : 7 - x;
            var piece = g_board[((pieceY + 2) * 0x10) + pieceX + 4];
            var pieceKey = GetPieceSvgKey(piece);

            if (pieceKey) {
                var pieceDiv = document.createElement('div');
                pieceDiv.className = 'chess-piece';
                pieceDiv.innerHTML = PIECE_SVG[pieceKey];
                td.appendChild(pieceDiv);
            }
        }
    }

    if (g_selectedSquare) {
        var selTd = g_uiBoard[g_selectedSquare.y * 8 + g_selectedSquare.x];
        if (selTd) selTd.classList.add('selected');

        for (var i = 0; i < g_legalTargets.length; i++) {
            var t = g_legalTargets[i];
            var targetTd = g_uiBoard[t.y * 8 + t.x];
            if (!targetTd) continue;
            var hasPieceThere = !!GetPieceAtUI(t.x, t.y);
            var dot = document.createElement('div');
            dot.className = hasPieceThere ? 'move-hint move-hint-capture' : 'move-hint';
            targetTd.appendChild(dot);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE-HISTORY NAVIGATION (⏮ ◀ ▶ ⏭) — chess.com style move review.
//
// SAFETY DESIGN: this entire block only READS g_boardHistory (plain array
// snapshots taken with g_board.slice() at the moment each move was applied)
// and writes purely to the DOM. It never calls MakeMove(), UnmakeMove(),
// GenerateValidMoves(), and never assigns to g_toMove or g_board. That is
// deliberate — an earlier check-detection feature once mutated g_toMove
// temporarily to reuse GenerateValidMoves(), which desynced the engine's
// internal state and caused the board to freeze and Undo to corrupt the
// position. Move-history browsing here cannot trigger that class of bug
// because it never calls into the engine at all; it is pure UI rendering
// from an already-recorded snapshot, entirely independent from the live
// RedrawPieces()/RedrawBoard() used for normal play.
// ═══════════════════════════════════════════════════════════════════════════

function IsAtLivePosition() {
    return g_viewIndex === (g_boardHistory.length - 1);
}

// Renders a past position for on-screen review only. Deliberately a
// separate function from RedrawPieces() (rather than a shared/refactored
// one) so the existing, already-verified live-rendering path is never
// touched by this feature.
function RenderHistorySnapshot(index) {
    var snapshot = g_boardHistory[index];
    if (!snapshot || !g_uiBoard) return;

    for (var y = 0; y < 8; y++) {
        for (var x = 0; x < 8; x++) {
            var td = g_uiBoard[y * 8 + x];
            if (!td) continue;
            td.innerHTML = '';
            td.classList.remove('selected');

            var pieceY = g_playerWhite ? y : 7 - y;
            var pieceX = g_playerWhite ? x : 7 - x;
            var piece = snapshot[MakeSquare(pieceY, pieceX)];
            var pieceKey = GetPieceSvgKey(piece);

            if (pieceKey) {
                var pieceDiv = document.createElement('div');
                pieceDiv.className = 'chess-piece';
                pieceDiv.innerHTML = PIECE_SVG[pieceKey];
                td.appendChild(pieceDiv);
            }
        }
    }
}

function UpdateHistoryNavButtons() {
    var atStart = (g_viewIndex <= 0);
    var atLive  = IsAtLivePosition();

    var btnFirst = document.getElementById('navFirst');
    var btnPrev  = document.getElementById('navPrev');
    var btnNext  = document.getElementById('navNext');
    var btnLast  = document.getElementById('navLast');

    if (btnFirst) btnFirst.disabled = atStart;
    if (btnPrev)  btnPrev.disabled  = atStart;
    if (btnNext)  btnNext.disabled  = atLive;
    if (btnLast)  btnLast.disabled  = atLive;
}

// Central entry point for all 4 nav buttons — clamps to valid range and
// re-renders. When the index lands back on "live", the normal live board
// (with selection/move-hints support) is restored via RedrawPieces();
// otherwise the read-only historical snapshot is shown.
function UIGoToHistoryIndex(idx) {
    if (!g_boardHistory || g_boardHistory.length === 0) return;
    var maxIdx = g_boardHistory.length - 1;
    if (idx < 0) idx = 0;
    if (idx > maxIdx) idx = maxIdx;

    g_viewIndex = idx;
    g_selectedSquare = null;
    g_legalTargets = [];

    if (IsAtLivePosition()) {
        RedrawPieces();
    } else {
        RenderHistorySnapshot(g_viewIndex);
    }
    UpdateHistoryNavButtons();
}

function UIHistoryFirst() { UIGoToHistoryIndex(0); }
function UIHistoryPrev()  { UIGoToHistoryIndex(g_viewIndex - 1); }
function UIHistoryNext()  { UIGoToHistoryIndex(g_viewIndex + 1); }
function UIHistoryLast()  { UIGoToHistoryIndex(g_boardHistory.length - 1); }

function RedrawBoard() {
    RecalcCellSize();
    var div = $("#board")[0];

    var table = document.createElement("table");
    table.cellPadding = "0px";
    table.cellSpacing = "0px";
    $(table).addClass('no-highlight');

    var tbody = document.createElement("tbody");
    g_uiBoard = [];

    for (var y = 0; y < 8; ++y) {
        var tr = document.createElement("tr");
        for (var x = 0; x < 8; ++x) {
            var td = document.createElement("td");
            td.style.width  = g_cellSize + "px";
            td.style.height = g_cellSize + "px";
            var isDark = ((y ^ x) & 1);
            td.className = (isDark ? 'board-dark' : 'board-light') + ' board-td';
            td.style.backgroundColor = isDark ? "#B58863" : "#F0D9B5";
            td.dataset.uiX = x;
            td.dataset.uiY = y;

            (function (ux, uy) {
                td.addEventListener('pointerdown', function (e) { OnSquarePointerDown(e, ux, uy); });
            })(x, y);

            tr.appendChild(td);
            g_uiBoard[y * 8 + x] = td;
        }
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    RedrawPieces();
    $(div).empty();
    div.appendChild(table);

    var evalBarEl = document.getElementById('evalBarContainer');
    if (evalBarEl) evalBarEl.style.height = (g_cellSize * 8) + 'px';

    g_changingFen = true;
    document.getElementById("FenTextBox").value = GetFen();
    g_changingFen = false;

    // Defensive refresh: RedrawBoard() is the most central function called
    // after every game-state change (new game, undo, FEN change). Refreshing
    // nav-button enabled/disabled state here too — in addition to the other
    // call sites — means it can never go stale even if some other code path
    // forgets to call it.
    if (typeof UpdateHistoryNavButtons === 'function') UpdateHistoryNavButtons();
}
