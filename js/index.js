/* =======================================================================
   CHESS ONLINE vs BOT — index.js
   Semua logic digabung dalam satu file:
   - Cookie-based auth (username/password)
   - Dashboard (difficulty tier + time control)
   - Matchmaking simulation (random bot profile)
   - Full chess rules engine (legal moves, check, checkmate, stalemate,
     castling, en passant, promotion) — ditulis manual, tanpa library luar
   - Stockfish UCI wrapper (UCI_Elo / UCI_LimitStrength)
   - Timer / clock per pemain
   - ELO progresif: game1 ±128, game2 ±64, game3 ±32, game4+ ±16, remis 0
   ======================================================================= */

(function () {
"use strict";

/* =======================================================================
   1. COOKIE HELPERS
   ======================================================================= */
function setCookie(name, value, days) {
  const expires = days
    ? "; expires=" + new Date(Date.now() + days * 864e5).toUTCString()
    : "";
  document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name) {
  document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

/* Simple non-cryptographic hash — cukup untuk menghindari plain-text
   password tersimpan apa adanya di cookie. Ini BUKAN untuk aplikasi
   produksi/security-sensitive. */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return "h" + Math.abs(hash).toString(36) + str.length;
}

/* =======================================================================
   2. USER DATABASE (disimpan di cookie sebagai JSON)
   Struktur: { "username": { passHash, elo, gameCount, wins, losses, draws } }
   ======================================================================= */
const USERS_COOKIE = "chessbot_users";
const SESSION_COOKIE = "chessbot_session";

function loadUsers() {
  const raw = getCookie(USERS_COOKIE);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

function saveUsers(users) {
  setCookie(USERS_COOKIE, JSON.stringify(users), 365);
}

function getCurrentUsername() {
  return getCookie(SESSION_COOKIE);
}

function setSession(username) {
  setCookie(SESSION_COOKIE, username, 365);
}

function clearSession() {
  deleteCookie(SESSION_COOKIE);
}

/* Memastikan setiap field numerik user SELALU berupa angka valid.
   Ini menutup celah NaN untuk akun lama (dibuat sebelum sistem Elo per
   kategori waktu ada) atau data cookie yang korup/tidak lengkap. */
function normalizeUserData(raw) {
  const num = (v, fallback) => (typeof v === "number" && !isNaN(v)) ? v : fallback;
  return {
    passHash: raw.passHash || "",
    levelChosen: raw.levelChosen === true, // default false jika belum pernah diset / tidak dikenali
    profilePhoto: (typeof raw.profilePhoto === "string") ? raw.profilePhoto : "",
    eloBullet: num(raw.eloBullet, 1320),
    eloBlitz: num(raw.eloBlitz, 1320),
    eloRapid: num(raw.eloRapid, 1320),
    gameCountBullet: num(raw.gameCountBullet, 0),
    gameCountBlitz: num(raw.gameCountBlitz, 0),
    gameCountRapid: num(raw.gameCountRapid, 0),
    wins: num(raw.wins, 0),
    losses: num(raw.losses, 0),
    draws: num(raw.draws, 0)
  };
}

function getCurrentUser() {
  const username = getCurrentUsername();
  if (!username) return null;
  const users = loadUsers();
  if (!users[username]) return null;
  const normalized = normalizeUserData(users[username]);
  return { username, ...normalized };
}

function updateCurrentUser(patch) {
  const username = getCurrentUsername();
  if (!username) return;
  const users = loadUsers();
  if (!users[username]) return;
  const normalized = normalizeUserData(users[username]);
  Object.assign(normalized, patch);
  users[username] = normalized;
  saveUsers(users);
}

/* =======================================================================
   3. RANDOM NAME / FLAG GENERATOR (untuk profil bot simulasi)
   ======================================================================= */
const BOT_FIRST_NAMES = [
  "Magnus", "Ivan", "Sergey", "Wei", "Hikaru", "Fabiano", "Alireza", "Ding",
  "Levon", "Anish", "Wesley", "Maxime", "Richard", "Jan", "Teimour", "Leinier",
  "Vladimir", "Alexander", "Dmitry", "Yu", "Nodirbek", "Vincent", "Andrey",
  "Pentala", "Jorden", "Radoslaw", "Baskaran", "Jeffery", "Awonder", "Praggnanandhaa"
];
const BOT_LAST_NAMES = [
  "Carlsen", "Petrov", "Nakamura", "Karjakin", "Yu", "Aronian", "Firouzja",
  "Liren", "Rapport", "Giri", "So", "Vachier-Lagrave", "Svidler", "Nepomniachtchi",
  "Le", "Grischuk", "Dominguez", "Wang", "Andreikin", "Xiong", "Abdusattorov",
  "Keymer", "Esipenko", "Harikrishna", "Van Foreest", "Duda"
];
const BOT_FLAGS = ["🇺🇸","🇳🇴","🇷🇺","🇮🇳","🇨🇳","🇫🇷","🇩🇪","🇳🇱","🇭🇺","🇦🇿","🇺🇦","🇵🇱","🇧🇷","🇪🇸","🇮🇹","🇬🇧","🇺🇿","🇦🇷","🇨🇦","🇮🇩"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBotProfile(minElo, maxElo) {
  const name = BOT_FIRST_NAMES[randInt(0, BOT_FIRST_NAMES.length - 1)] + " " +
               BOT_LAST_NAMES[randInt(0, BOT_LAST_NAMES.length - 1)];
  const elo = randInt(minElo, maxElo);
  const flag = BOT_FLAGS[randInt(0, BOT_FLAGS.length - 1)];
  return { name, elo, flag };
}

/* =======================================================================
   4. ELO CALCULATION (progresif sesuai spesifikasi user)
   Game 1: ±128 | Game 2: ±64 | Game 3: ±32 | Game 4+: ±16 | Remis: 0
   ======================================================================= */
const ELO_STEPS = [128, 64, 32, 16]; // index 3 dan seterusnya tetap 16

function getEloChangeAmount(gameCountBeforeThisGame) {
  // gameCountBeforeThisGame = jumlah game yang SUDAH selesai sebelum game ini
  // Game pertama -> gameCountBeforeThisGame = 0 -> index 0 -> 128
  const idx = Math.min(gameCountBeforeThisGame, ELO_STEPS.length - 1);
  return ELO_STEPS[idx];
}

function calculateEloChange(gameCountBeforeThisGame, result) {
  if (result === "draw") return 0;
  const amount = getEloChangeAmount(gameCountBeforeThisGame);
  return result === "win" ? amount : -amount;
}

/* =======================================================================
   5. PAGE NAVIGATION
   ======================================================================= */
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

/* =======================================================================
   6. CHESS RULES ENGINE (manual implementation, 0x88-free simple 8x8 array)
   Board direpresentasikan sebagai array 64 elemen, index 0 = a8, index 63 = h1
   (baris atas ke bawah, kiri ke kanan) — supaya gampang di-render ke grid CSS.
   Piece format: { type: 'p'|'n'|'b'|'r'|'q'|'k', color: 'w'|'b' }
   ======================================================================= */

function sqIndex(file, rank) { // file 0-7 (a-h), rank 0-7 (8..1 dari atas)
  return rank * 8 + file;
}
function fileOf(idx) { return idx % 8; }
function rankOf(idx) { return Math.floor(idx / 8); }
function algebraic(idx) {
  const f = "abcdefgh"[fileOf(idx)];
  const r = 8 - rankOf(idx);
  return f + r;
}
function fromAlgebraic(str) {
  const f = str.charCodeAt(0) - 97;
  const r = 8 - parseInt(str[1], 10);
  return sqIndex(f, r);
}

function createInitialBoard() {
  const back = ["r","n","b","q","k","b","n","r"];
  const board = new Array(64).fill(null);
  for (let f = 0; f < 8; f++) {
    board[sqIndex(f,0)] = { type: back[f], color: "b" };
    board[sqIndex(f,1)] = { type: "p", color: "b" };
    board[sqIndex(f,6)] = { type: "p", color: "w" };
    board[sqIndex(f,7)] = { type: back[f], color: "w" };
  }
  return board;
}

class ChessGame {
  constructor() {
    this.board = createInitialBoard();
    this.turn = "w";
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epTarget = null; // en passant target square index
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = []; // { san, from, to, piece, captured, promotion, isCheck, isMate }
  }

  clone() {
    const g = new ChessGame();
    g.board = this.board.slice();
    g.turn = this.turn;
    g.castling = { ...this.castling };
    g.epTarget = this.epTarget;
    g.halfmoveClock = this.halfmoveClock;
    g.fullmoveNumber = this.fullmoveNumber;
    g.history = this.history.slice();
    return g;
  }

  pieceAt(idx) { return this.board[idx]; }

  findKing(color) {
    for (let i = 0; i < 64; i++) {
      const p = this.board[i];
      if (p && p.type === "k" && p.color === color) return i;
    }
    return -1;
  }

  isSquareAttacked(idx, byColor) {
    const f0 = fileOf(idx), r0 = rankOf(idx);
    // Pawn attacks
    const pawnDir = byColor === "w" ? 1 : -1; // pawn moves "up" the board towards rank0 for white
    for (const df of [-1, 1]) {
      const f = f0 + df, r = r0 + pawnDir;
      if (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const p = this.board[sqIndex(f, r)];
        if (p && p.type === "p" && p.color === byColor) return true;
      }
    }
    // Knight attacks
    const knightDeltas = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
    for (const [df, dr] of knightDeltas) {
      const f = f0 + df, r = r0 + dr;
      if (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const p = this.board[sqIndex(f, r)];
        if (p && p.type === "n" && p.color === byColor) return true;
      }
    }
    // King attacks (adjacent)
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = f0 + df, r = r0 + dr;
      if (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const p = this.board[sqIndex(f, r)];
        if (p && p.type === "k" && p.color === byColor) return true;
      }
    }
    // Sliding: rook/queen (straight)
    const straightDirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const [df, dr] of straightDirs) {
      let f = f0 + df, r = r0 + dr;
      while (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const p = this.board[sqIndex(f, r)];
        if (p) {
          if (p.color === byColor && (p.type === "r" || p.type === "q")) return true;
          break;
        }
        f += df; r += dr;
      }
    }
    // Sliding: bishop/queen (diagonal)
    const diagDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [df, dr] of diagDirs) {
      let f = f0 + df, r = r0 + dr;
      while (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const p = this.board[sqIndex(f, r)];
        if (p) {
          if (p.color === byColor && (p.type === "b" || p.type === "q")) return true;
          break;
        }
        f += df; r += dr;
      }
    }
    return false;
  }

  inCheck(color) {
    const kingIdx = this.findKing(color);
    if (kingIdx === -1) return false;
    return this.isSquareAttacked(kingIdx, color === "w" ? "b" : "w");
  }

  /* Generate pseudo-legal moves for a piece at idx (tidak cek apakah raja jadi skak) */
  pseudoMovesFor(idx) {
    const piece = this.board[idx];
    if (!piece) return [];
    const moves = [];
    const f0 = fileOf(idx), r0 = rankOf(idx);
    const color = piece.color;
    const enemy = color === "w" ? "b" : "w";

    const pushIfValid = (f, r, captureOnly, noCaptue) => {
      if (f < 0 || f > 7 || r < 0 || r > 7) return false;
      const target = sqIndex(f, r);
      const p = this.board[target];
      if (!p) {
        if (!captureOnly) moves.push({ from: idx, to: target });
        return true; // empty, can continue sliding
      } else {
        if (p.color === enemy && !noCaptue) moves.push({ from: idx, to: target, capture: true });
        return false; // blocked
      }
    };

    if (piece.type === "p") {
      const dir = color === "w" ? -1 : 1;
      const startRank = color === "w" ? 6 : 1;
      const promoRank = color === "w" ? 0 : 7;
      // forward 1
      let r = r0 + dir;
      if (r >= 0 && r < 8 && !this.board[sqIndex(f0, r)]) {
        if (r === promoRank) {
          ["q","r","b","n"].forEach(pr => moves.push({ from: idx, to: sqIndex(f0, r), promotion: pr }));
        } else {
          moves.push({ from: idx, to: sqIndex(f0, r) });
        }
        // forward 2
        if (r0 === startRank) {
          const r2 = r0 + dir * 2;
          if (!this.board[sqIndex(f0, r2)]) {
            moves.push({ from: idx, to: sqIndex(f0, r2), doublePush: true });
          }
        }
      }
      // captures
      for (const df of [-1, 1]) {
        const f = f0 + df, rr = r0 + dir;
        if (f < 0 || f > 7 || rr < 0 || rr > 7) continue;
        const target = sqIndex(f, rr);
        const p = this.board[target];
        if (p && p.color === enemy) {
          if (rr === promoRank) {
            ["q","r","b","n"].forEach(pr => moves.push({ from: idx, to: target, capture: true, promotion: pr }));
          } else {
            moves.push({ from: idx, to: target, capture: true });
          }
        } else if (this.epTarget === target) {
          moves.push({ from: idx, to: target, capture: true, enPassant: true });
        }
      }
    } else if (piece.type === "n") {
      const deltas = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
      for (const [df, dr] of deltas) pushIfValid(f0+df, r0+dr, false, false);
    } else if (piece.type === "k") {
      for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;
        pushIfValid(f0+df, r0+dr, false, false);
      }
      // Castling
      const rank = color === "w" ? 7 : 0;
      if (r0 === rank && f0 === 4 && !this.inCheck(color)) {
        const kFlag = color === "w" ? "wK" : "bK";
        const qFlag = color === "w" ? "wQ" : "bQ";
        // king side
        if (this.castling[kFlag] &&
            !this.board[sqIndex(5, rank)] && !this.board[sqIndex(6, rank)] &&
            !this.isSquareAttacked(sqIndex(5, rank), enemy) &&
            !this.isSquareAttacked(sqIndex(6, rank), enemy)) {
          moves.push({ from: idx, to: sqIndex(6, rank), castle: "K" });
        }
        // queen side
        if (this.castling[qFlag] &&
            !this.board[sqIndex(3, rank)] && !this.board[sqIndex(2, rank)] && !this.board[sqIndex(1, rank)] &&
            !this.isSquareAttacked(sqIndex(3, rank), enemy) &&
            !this.isSquareAttacked(sqIndex(2, rank), enemy)) {
          moves.push({ from: idx, to: sqIndex(2, rank), castle: "Q" });
        }
      }
    } else {
      const dirs = piece.type === "r" ? [[1,0],[-1,0],[0,1],[0,-1]]
                  : piece.type === "b" ? [[1,1],[1,-1],[-1,1],[-1,-1]]
                  : [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]; // queen
      for (const [df, dr] of dirs) {
        let f = f0 + df, r = r0 + dr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
          const cont = pushIfValid(f, r, false, false);
          if (!cont) break;
          f += df; r += dr;
        }
      }
    }
    return moves;
  }

  /* Terapkan move ke papan (mutasi this), return info untuk undo/history */
  applyMove(move) {
    const piece = this.board[move.from];
    const captured = this.board[move.to];
    const color = piece.color;

    // En passant capture
    let epCaptureSquare = null;
    if (move.enPassant) {
      epCaptureSquare = sqIndex(fileOf(move.to), rankOf(move.from));
      this.board[epCaptureSquare] = null;
    }

    this.board[move.to] = move.promotion
      ? { type: move.promotion, color }
      : piece;
    this.board[move.from] = null;

    // Castling rook move
    if (move.castle === "K") {
      const rank = color === "w" ? 7 : 0;
      this.board[sqIndex(5, rank)] = this.board[sqIndex(7, rank)];
      this.board[sqIndex(7, rank)] = null;
    } else if (move.castle === "Q") {
      const rank = color === "w" ? 7 : 0;
      this.board[sqIndex(3, rank)] = this.board[sqIndex(0, rank)];
      this.board[sqIndex(0, rank)] = null;
    }

    // Update castling rights
    if (piece.type === "k") {
      if (color === "w") { this.castling.wK = false; this.castling.wQ = false; }
      else { this.castling.bK = false; this.castling.bQ = false; }
    }
    if (piece.type === "r") {
      if (move.from === sqIndex(0,7)) this.castling.wQ = false;
      if (move.from === sqIndex(7,7)) this.castling.wK = false;
      if (move.from === sqIndex(0,0)) this.castling.bQ = false;
      if (move.from === sqIndex(7,0)) this.castling.bK = false;
    }
    // If a rook gets captured on its home square
    if (move.to === sqIndex(0,7)) this.castling.wQ = false;
    if (move.to === sqIndex(7,7)) this.castling.wK = false;
    if (move.to === sqIndex(0,0)) this.castling.bQ = false;
    if (move.to === sqIndex(7,0)) this.castling.bK = false;

    // En passant target for next move
    this.epTarget = move.doublePush
      ? sqIndex(fileOf(move.to), (rankOf(move.from) + rankOf(move.to)) / 2)
      : null;

    // Halfmove clock
    if (piece.type === "p" || captured || move.enPassant) this.halfmoveClock = 0;
    else this.halfmoveClock++;

    if (color === "b") this.fullmoveNumber++;
    this.turn = color === "w" ? "b" : "w";

    return { captured: move.enPassant ? { type: "p", color: color === "w" ? "b" : "w" } : captured };
  }

  /* Legal moves = pseudo moves yang tidak membuat raja sendiri skak */
  legalMovesFor(idx) {
    const piece = this.board[idx];
    if (!piece || piece.color !== this.turn) return [];
    const pseudo = this.pseudoMovesFor(idx);
    const legal = [];
    for (const m of pseudo) {
      const clone = this.clone();
      clone.applyMove(m);
      if (!clone.inCheck(piece.color)) legal.push(m);
    }
    return legal;
  }

  allLegalMoves(color) {
    const all = [];
    for (let i = 0; i < 64; i++) {
      const p = this.board[i];
      if (p && p.color === color) all.push(...this.legalMovesFor(i));
    }
    return all;
  }

  isCheckmate() {
    return this.inCheck(this.turn) && this.allLegalMoves(this.turn).length === 0;
  }
  isStalemate() {
    return !this.inCheck(this.turn) && this.allLegalMoves(this.turn).length === 0;
  }
  isDeadPosition() {
    // Simplified: K vs K, K+N vs K, K+B vs K
    const pieces = this.board.filter(p => p);
    if (pieces.length > 4) return false;
    const nonKing = pieces.filter(p => p.type !== "k");
    if (nonKing.length === 0) return true;
    if (nonKing.length === 1 && (nonKing[0].type === "n" || nonKing[0].type === "b")) return true;
    return false;
  }
  isFiftyMoveRule() { return this.halfmoveClock >= 100; }

  gameOverReason() {
    if (this.isCheckmate()) return { over: true, reason: "checkmate", winner: this.turn === "w" ? "b" : "w" };
    if (this.isStalemate()) return { over: true, reason: "stalemate", winner: null };
    if (this.isFiftyMoveRule()) return { over: true, reason: "fifty-move", winner: null };
    if (this.isDeadPosition()) return { over: true, reason: "dead-position", winner: null };
    return { over: false };
  }

  toFEN() {
    let rows = [];
    for (let r = 0; r < 8; r++) {
      let row = "", empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.board[sqIndex(f, r)];
        if (!p) { empty++; continue; }
        if (empty > 0) { row += empty; empty = 0; }
        let ch = p.type;
        row += p.color === "w" ? ch.toUpperCase() : ch;
      }
      if (empty > 0) row += empty;
      rows.push(row);
    }
    const boardStr = rows.join("/");
    const turnStr = this.turn;
    let castleStr = "";
    if (this.castling.wK) castleStr += "K";
    if (this.castling.wQ) castleStr += "Q";
    if (this.castling.bK) castleStr += "k";
    if (this.castling.bQ) castleStr += "q";
    if (!castleStr) castleStr = "-";
    const epStr = this.epTarget !== null ? algebraic(this.epTarget) : "-";
    return `${boardStr} ${turnStr} ${castleStr} ${epStr} ${this.halfmoveClock} ${this.fullmoveNumber}`;
  }

  /* Convert a move object to simple algebraic notation (untuk history display) */
  moveToSAN(move, legalMovesForPiece) {
    const piece = this.board[move.from];
    const destStr = algebraic(move.to);
    if (move.castle === "K") return "O-O";
    if (move.castle === "Q") return "O-O-O";
    let s = "";
    if (piece.type !== "p") {
      s += piece.type.toUpperCase();
    } else if (move.capture) {
      s += "abcdefgh"[fileOf(move.from)];
    }
    if (move.capture) s += "x";
    s += destStr;
    if (move.promotion) s += "=" + move.promotion.toUpperCase();
    return s;
  }
}

/* =======================================================================
   7. STOCKFISH UCI WRAPPER
   Melemahkan Stockfish via UCI_LimitStrength + UCI_Elo (bukan depth/time).
   Mencoba stockfish-18-lite-single.js dulu, fallback ke stockfish.js.
   ======================================================================= */
class StockfishEngine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.pendingResolvers = [];
  }

  async init() {
    const candidates = ["stockfish-18-lite-single.js", "stockfish.js"];
    let lastErr = null;
    for (const file of candidates) {
      try {
        await this._tryLoad(file);
        return true;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Tidak bisa memuat file Stockfish.");
  }

  _tryLoad(filename) {
    return new Promise((resolve, reject) => {
      let settled = false;
      try {
        this.worker = new Worker(filename);
      } catch (e) {
        reject(e);
        return;
      }
      const onMsg = (e) => {
        const line = typeof e.data === "string" ? e.data : "";
        if (line === "uciok" || line.startsWith("Stockfish")) {
          if (!settled) {
            settled = true;
            this.worker.removeEventListener("message", onMsg);
            this.ready = true;
            this.worker.onmessage = (ev) => this._handleMessage(ev);
            resolve();
          }
        }
      };
      this.worker.addEventListener("message", onMsg);
      this.worker.onerror = (err) => {
        if (!settled) { settled = true; reject(err); }
      };
      this.worker.postMessage("uci");
      // Timeout jika file tidak merespon (misal file tidak ada)
      setTimeout(() => {
        if (!settled) { settled = true; reject(new Error("Timeout memuat " + filename)); }
      }, 4000);
    });
  }

  _handleMessage(e) {
    const line = typeof e.data === "string" ? e.data : "";
    if (line.startsWith("bestmove")) {
      const resolver = this.pendingResolvers.shift();
      if (resolver) {
        const parts = line.split(" ");
        resolver(parts[1]); // UCI move string e.g. "e2e4" atau "e7e8q"
      }
    }
  }

  send(cmd) {
    if (this.worker) this.worker.postMessage(cmd);
  }

  setElo(elo) {
    this.send("setoption name UCI_LimitStrength value true");
    this.send("setoption name UCI_Elo value " + Math.max(1350, Math.min(2850, elo)));
  }

  newGame() {
    this.send("ucinewgame");
    this.send("isready");
  }

  getBestMove(fen, movetimeMs) {
    return new Promise((resolve) => {
      this.pendingResolvers.push(resolve);
      this.send("position fen " + fen);
      this.send("go movetime " + Math.round(movetimeMs));
    });
  }

  quit() {
    if (this.worker) {
      this.send("quit");
      this.worker.terminate();
    }
  }
}

/* =======================================================================
   8. SVG PIECE SET (menggantikan unicode glyph)
   Key format: warna+jenis huruf kecil, contoh "wk"=White King, "bp"=Black Pawn
   ======================================================================= */
const PIECE_SVG = {
  wk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#fff" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#fff" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"/><path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/></g></svg>`,
  wq: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L6 14l3 12z"/><path stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>`,
  wr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/><path d="M34 14l-3 3H14l-3-3"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M31 17v12.5H14V17"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path fill="none" stroke-linejoin="miter" d="M11 14h23"/></g></svg>`,
  wb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>`,
  wn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#fff" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><path fill="#000" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zM14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"/></g></svg>`,
  wp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  bk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#000" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"/><path stroke="#fff" stroke-width="1.5" d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/><path fill="none" stroke="#fff" stroke-width="1" d="M20.5 25s3-5 2.5-8.5M24.5 25s-3-5-2.5-8.5"/></g></svg>`,
  bq: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path fill="#000" stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/><path fill="#000" stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" stroke="#fff" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>`,
  br: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" stroke-linecap="butt" d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M14 29.5v-13h17v13H14z"/><path fill="#000" stroke-linecap="butt" d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/><path fill="none" stroke="#fff" stroke-linejoin="miter" stroke-width="1" d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23"/></g></svg>`,
  bb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke="#fff" stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>`,
  bn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" stroke="#333" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#000" stroke="#333" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><circle cx="9" cy="25.5" r="1.5" fill="#fff"/><ellipse cx="14.5" cy="15.5" rx="1.5" ry="3" fill="#fff" transform="rotate(30 14.5 15.5)"/><path fill="none" stroke="#555" stroke-width="1" d="M25 10.5c4 1 7 3 9 7M27 14c2 1 4 3 5 6"/></g></svg>`,
  bp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#333" stroke-width="1.5" stroke-linecap="round"/></svg>`
};

/* =======================================================================
   8b. SOUND EFFECTS
   File diambil dari folder "sound/" sejajar dengan index.html:
     sound/move-self.mp3   -> langkah biasa
     sound/capture.mp3     -> menangkap bidak lawan
     sound/move-check.mp3  -> langkah yang membuat lawan skak
     sound/promote.mp3     -> promosi bidak
     sound/castle.mp3      -> rokade (castling)
   ======================================================================= */
const SOUND_FILES = {
  moveSelf: "sound/move-self.mp3",
  capture: "sound/capture.mp3",
  check: "sound/move-check.mp3",
  promote: "sound/promote.mp3",
  castle: "sound/castle.mp3"
};

const _soundCache = {};
function preloadSounds() {
  Object.keys(SOUND_FILES).forEach(key => {
    try {
      const audio = new Audio(SOUND_FILES[key]);
      audio.preload = "auto";
      _soundCache[key] = audio;
    } catch (e) {
      // Diabaikan; playSound akan mencoba lagi saat dipanggil
    }
  });
}

function playSound(key) {
  try {
    const cached = _soundCache[key];
    const audio = cached ? cached.cloneNode() : new Audio(SOUND_FILES[key]);
    audio.play().catch(() => { /* browser mungkin blokir autoplay sebelum interaksi user */ });
  } catch (e) {
    // Diam-diam gagal jika file tidak ada / browser menolak
  }
}

/* Menentukan suara yang tepat untuk sebuah move yang BARU SAJA diterapkan.
   Prioritas: castle > promote > check > capture > move biasa.
   `causesCheck` = apakah lawan (yang akan jalan berikutnya) sedang skak setelah move ini. */
function pickMoveSound(move, wasCapture, causesCheck) {
  if (move.castle === "K" || move.castle === "Q") return "castle";
  if (move.promotion) return "promote";
  if (causesCheck) return "check";
  if (wasCapture || move.enPassant) return "capture";
  return "moveSelf";
}

/* =======================================================================
   Export ke window supaya bisa dites/diakses (dan dipakai oleh init() di bawah)
   ======================================================================= */
window.__chessApp = {
  setCookie, getCookie, deleteCookie, simpleHash,
  loadUsers, saveUsers, getCurrentUsername, setSession, clearSession,
  getCurrentUser, updateCurrentUser,
  generateBotProfile, calculateEloChange, getEloChangeAmount, randInt,
  showPage,
  ChessGame, sqIndex, fileOf, rankOf, algebraic, fromAlgebraic,
  StockfishEngine
};

/* =======================================================================
   9. APP CONTROLLER — dijalankan setelah DOM ready
   ======================================================================= */
document.addEventListener("DOMContentLoaded", init);

function init() {
  const app = window.__chessApp;
  preloadSounds();

  /* ---------- STATE ---------- */
  const state = {
    game: null,          // ChessGame instance
    engine: null,         // StockfishEngine instance
    engineReady: false,
    selectedSquare: null,
    legalMovesForSelected: [],
    playerColor: "w",
    timeControl: null,    // { time, inc, category }
    bot: null,            // { name, elo, flag }
    playerMs: 0,
    botMs: 0,
    clockInterval: null,
    lastMoveTime: 0,
    gameActive: false,
    lastMoveSquares: null, // {from, to}
    drawOffersUsed: 0,
    matchmakingCancelled: false,
    moveCount: 0          // jumlah langkah yang sudah dimainkan di game ini (untuk fitur "batalkan sebelum langkah pertama")
  };

  /* ---------- AUTH: TABS ---------- */
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  /* ---------- AUTH: REGISTER ---------- */
  document.getElementById("register-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value;
    const password2 = document.getElementById("register-password2").value;
    const errEl = document.getElementById("register-error");

    if (username.length < 3) { errEl.textContent = "Username minimal 3 karakter."; return; }
    if (password.length < 4) { errEl.textContent = "Password minimal 4 karakter."; return; }
    if (password !== password2) { errEl.textContent = "Password tidak sama."; return; }

    const users = app.loadUsers();
    if (users[username]) { errEl.textContent = "Username sudah dipakai."; return; }

    users[username] = {
      passHash: app.simpleHash(password),
      levelChosen: false,
      eloBullet: 1320,
      eloBlitz: 1320,
      eloRapid: 1320,
      gameCountBullet: 0,
      gameCountBlitz: 0,
      gameCountRapid: 0,
      wins: 0,
      losses: 0,
      draws: 0
    };
    app.saveUsers(users);
    app.setSession(username);
    errEl.textContent = "";
    app.showPage("level-select-page");
  });

  /* ---------- LEVEL SELECT (hanya sekali, setelah daftar akun baru) ---------- */
  let chosenStartLevel = null;
  document.querySelectorAll("#level-select-page .difficulty-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll("#level-select-page .difficulty-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      chosenStartLevel = {
        tier: card.dataset.tier,
        base: parseInt(card.dataset.base, 10)
      };
      const btn = document.getElementById("confirm-level-btn");
      btn.disabled = false;
      btn.textContent = "Mulai sebagai " + chosenStartLevel.tier + " (Rating " + chosenStartLevel.base + ")";
    });
  });

  document.getElementById("confirm-level-btn").addEventListener("click", () => {
    if (!chosenStartLevel) return;
    const base = chosenStartLevel.base;
    app.updateCurrentUser({
      levelChosen: true,
      eloBullet: base,
      eloBlitz: base,
      eloRapid: base
    });
    chosenStartLevel = null;
    enterDashboard();
  });

  /* ---------- AUTH: LOGIN ---------- */
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const errEl = document.getElementById("login-error");

    const users = app.loadUsers();
    const user = users[username];
    if (!user || user.passHash !== app.simpleHash(password)) {
      errEl.textContent = "Username atau password salah.";
      return;
    }
    app.setSession(username);
    errEl.textContent = "";
    enterDashboard();
  });

  /* ---------- LOGOUT ---------- */
  document.getElementById("logout-btn").addEventListener("click", () => {
    app.clearSession();
    app.showPage("auth-page");
  });

  /* ---------- CHECK EXISTING SESSION ON LOAD ---------- */
  {
    const existingUser = app.getCurrentUser();
    if (existingUser && existingUser.levelChosen === false) {
      app.showPage("level-select-page");
    } else if (existingUser) {
      enterDashboard();
    }
  }

  function enterDashboard() {
    const user = app.getCurrentUser();
    document.getElementById("dash-username").textContent = user.username;
    document.getElementById("rating-bullet").textContent = user.eloBullet;
    document.getElementById("rating-blitz").textContent = user.eloBlitz;
    document.getElementById("rating-rapid").textContent = user.eloRapid;
    document.getElementById("stat-wins").textContent = user.wins;
    document.getElementById("stat-losses").textContent = user.losses;
    document.getElementById("stat-draws").textContent = user.draws;
    document.getElementById("stat-games").textContent =
      user.gameCountBullet + user.gameCountBlitz + user.gameCountRapid;
    applyProfilePhotoToUI(user.profilePhoto);
    app.showPage("dashboard-page");
  }

  /* Menampilkan foto profil (atau placeholder ikon) di dashboard & panel game */
  function applyProfilePhotoToUI(photoDataUrl) {
    const hasPhoto = !!photoDataUrl;

    const dashImg = document.getElementById("profile-avatar-img");
    const dashPlaceholder = document.getElementById("profile-avatar-placeholder");
    if (dashImg && dashPlaceholder) {
      if (hasPhoto) {
        dashImg.src = photoDataUrl;
        dashImg.classList.remove("hidden");
        dashPlaceholder.classList.add("hidden");
      } else {
        dashImg.classList.add("hidden");
        dashPlaceholder.classList.remove("hidden");
      }
    }

    const panelImg = document.getElementById("player-panel-avatar-img");
    const panelPlaceholder = document.getElementById("player-panel-avatar-placeholder");
    if (panelImg && panelPlaceholder) {
      if (hasPhoto) {
        panelImg.src = photoDataUrl;
        panelImg.classList.remove("hidden");
        panelPlaceholder.style.display = "none";
      } else {
        panelImg.classList.add("hidden");
        panelPlaceholder.style.display = "";
      }
    }
  }

  /* ---------- PROFIL: GANTI FOTO ---------- */
  // Dimensi kecil + kompresi iteratif supaya hasil base64 aman disimpan di
  // cookie (batas umum ~4KB PER cookie, dan cookie ini juga menampung seluruh
  // data akun lain, jadi foto harus jauh lebih kecil dari 4KB itu sendiri).
  const PHOTO_DIMENSION = 64; // px persegi
  const MAX_PHOTO_BASE64_BYTES = 2000; // batas aman, sisakan ruang untuk data akun lainnya

  document.getElementById("change-photo-btn").addEventListener("click", () => {
    document.getElementById("photo-file-input").click();
  });

  document.getElementById("photo-file-input").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("File harus berupa gambar.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Selalu crop ke persegi lalu resize ke ukuran tetap kecil (64x64),
        // supaya ukuran akhir dapat diprediksi dan tidak bergantung pada
        // dimensi asli foto yang diupload.
        const canvas = document.createElement("canvas");
        canvas.width = PHOTO_DIMENSION;
        canvas.height = PHOTO_DIMENSION;
        const ctx = canvas.getContext("2d");

        const srcSize = Math.min(img.width, img.height);
        const srcX = (img.width - srcSize) / 2;
        const srcY = (img.height - srcSize) / 2;
        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, PHOTO_DIMENSION, PHOTO_DIMENSION);

        // Coba beberapa level kualitas JPEG menurun sampai hasil base64
        // muat dalam batas aman.
        const qualities = [0.6, 0.4, 0.25, 0.15];
        let finalDataUrl = null;
        for (const q of qualities) {
          const candidate = canvas.toDataURL("image/jpeg", q);
          if (candidate.length <= MAX_PHOTO_BASE64_BYTES) {
            finalDataUrl = candidate;
            break;
          }
        }

        if (!finalDataUrl) {
          alert("Foto tidak dapat disimpan karena ukurannya masih terlalu besar setelah dikompres. Coba foto lain yang lebih sederhana.");
          return;
        }

        app.updateCurrentUser({ profilePhoto: finalDataUrl });
        applyProfilePhotoToUI(finalDataUrl);
      };
      img.onerror = () => {
        alert("Gagal memuat gambar. Coba file lain.");
      };
      img.src = ev.target.result;
    };
    reader.onerror = () => {
      alert("Gagal membaca file.");
    };
    reader.readAsDataURL(file);
  });

  /* ---------- DASHBOARD: TIME CONTROL SELECTION ---------- */
  document.querySelectorAll(".time-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".time-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      state.timeControl = {
        time: parseInt(card.dataset.time, 10),
        inc: parseInt(card.dataset.inc, 10),
        category: card.dataset.category
      };
      updateFindMatchButton();
    });
  });

  function updateFindMatchButton() {
    const btn = document.getElementById("find-match-btn");
    if (state.timeControl) {
      btn.disabled = false;
      btn.textContent = "Cari Lawan";
    } else {
      btn.disabled = true;
      btn.textContent = "Pilih kontrol waktu dulu";
    }
  }

  /* Ambil field elo & gameCount user sesuai kategori waktu yang dipilih */
  function eloFieldFor(category) {
    if (category === "bullet") return "eloBullet";
    if (category === "blitz") return "eloBlitz";
    return "eloRapid";
  }
  function gameCountFieldFor(category) {
    if (category === "bullet") return "gameCountBullet";
    if (category === "blitz") return "gameCountBlitz";
    return "gameCountRapid";
  }

  /* ---------- FIND MATCH ---------- */
  document.getElementById("find-match-btn").addEventListener("click", () => {
    startMatchmaking();
  });

  function startMatchmaking() {
    app.showPage("matchmaking-page");
    state.matchmakingCancelled = false;

    const user = app.getCurrentUser();
    const eloField = eloFieldFor(state.timeControl.category);
    const playerElo = (user && typeof user[eloField] === "number" && !isNaN(user[eloField]))
      ? user[eloField]
      : 1320;

    const searchDurationMs = app.randInt(1200, 2800);
    setTimeout(async () => {
      if (state.matchmakingCancelled) return;
      const min = Math.max(1320, playerElo - 50);
      const max = Math.min(3190, playerElo + 50);
      state.bot = app.generateBotProfile(min, max);
      await startGame();
    }, searchDurationMs);
  }

  document.getElementById("cancel-matchmaking-btn").addEventListener("click", () => {
    state.matchmakingCancelled = true;
    enterDashboard();
  });

  /* ---------- GAME SETUP ---------- */
  async function startGame() {
    state.game = new (app.ChessGame)();
    state.selectedSquare = null;
    state.legalMovesForSelected = [];
    state.lastMoveSquares = null;
    state.drawOffersUsed = 0;
    state.moveCount = 0;

    // Sembunyikan indikator perubahan Elo dari game sebelumnya (jika ada)
    const playerChangeEl0 = document.getElementById("game-player-elo-change");
    const opponentChangeEl0 = document.getElementById("game-opponent-elo-change");
    playerChangeEl0.textContent = "";
    playerChangeEl0.classList.add("hidden");
    opponentChangeEl0.textContent = "";
    opponentChangeEl0.classList.add("hidden");

    const user = app.getCurrentUser();
    if (!user) {
      app.showPage("auth-page");
      return;
    }
    const eloField = eloFieldFor(state.timeControl.category);
    const playerElo = user[eloField];

    // Aturan warna: rating pemain lebih tinggi -> pemain pegang Hitam;
    // rating lawan lebih tinggi -> pemain pegang Putih. Jika sama, default Putih.
    state.playerColor = (playerElo > state.bot.elo) ? "b" : "w";

    state.playerMs = state.timeControl.time * 1000;
    state.botMs = state.timeControl.time * 1000;
    state.gameActive = true;

    document.getElementById("game-player-name").textContent = user.username;
    document.getElementById("game-player-elo").textContent = playerElo;
    document.getElementById("game-opponent-name").textContent = state.bot.name;
    document.getElementById("game-opponent-elo").textContent = state.bot.elo;
    applyProfilePhotoToUI(user.profilePhoto);
    document.getElementById("game-opponent-flag").textContent = state.bot.flag;
    document.getElementById("move-history").innerHTML = "";

    app.showPage("game-page");
    renderBoard();
    updateClocks();

    if (!state.engine) {
      state.engine = new StockfishEngine();
      try {
        await state.engine.init();
        state.engineReady = true;
      } catch (e) {
        alert("Gagal memuat Stockfish. Pastikan file stockfish-18-lite-single.js/.wasm ada di folder yang sama.");
        state.engineReady = false;
        return;
      }
    }
    state.engine.newGame();
    state.engine.setElo(state.bot.elo);
    startClock();

    if (state.playerColor === "b") {
      // Pemain pegang Hitam -> Putih (bot) jalan duluan
      setTimeout(() => requestBotMove(), 300);
    }
  }

  /* ---------- BOARD RENDERING ---------- */
  /* ---------- BOARD RENDERING ---------- */
  function renderBoard() {
    const boardEl = document.getElementById("chessboard");
    boardEl.innerHTML = "";
    const flip = state.playerColor === "b";

    for (let displayRow = 0; displayRow < 8; displayRow++) {
      for (let displayCol = 0; displayCol < 8; displayCol++) {
        const rank = flip ? 7 - displayRow : displayRow;
        const file = flip ? 7 - displayCol : displayCol;
        const idx = app.sqIndex(file, rank);

        const sq = document.createElement("div");
        sq.className = "square " + (((rank + file) % 2 === 0) ? "light" : "dark");
        sq.dataset.idx = idx;

        if (state.lastMoveSquares && (idx === state.lastMoveSquares.from || idx === state.lastMoveSquares.to)) {
          sq.classList.add("last-move");
        }

        const piece = state.game.pieceAt(idx);
        if (piece) {
          const glyph = document.createElement("div");
          glyph.className = "piece";
          glyph.innerHTML = PIECE_SVG[piece.color + piece.type] || "";
          if (piece.type === "k" && state.game.inCheck(piece.color) && state.game.turn === piece.color) {
            sq.classList.add("in-check");
          }
          // Drag hanya diaktifkan untuk bidak milik pemain saat memang gilirannya.
          // PENTING: dragstart TIDAK BOLEH memicu renderBoard() / recreate DOM,
          // karena browser otomatis membatalkan operasi drag jika elemen sumber
          // dihapus dari DOM di tengah drag. Highlight seleksi karena itu
          // dilakukan lewat toggle class langsung (updateSelectionHighlight),
          // bukan dengan membangun ulang seluruh papan.
          const canDrag = state.gameActive && state.game.turn === state.playerColor && piece.color === state.playerColor;
          glyph.draggable = canDrag;
          glyph.addEventListener("dragstart", (e) => {
            if (!canDrag) { e.preventDefault(); return; }
            selectSquare(idx); // hanya hitung legal moves + update highlight, TANPA render ulang DOM
            if (e.dataTransfer) {
              e.dataTransfer.effectAllowed = "move";
              try { e.dataTransfer.setData("text/plain", String(idx)); } catch (err) { /* beberapa browser mobile strict, abaikan */ }
            }
          });
          sq.appendChild(glyph);
        }

        sq.addEventListener("click", () => onSquareClick(idx));
        sq.addEventListener("dragover", (e) => {
          e.preventDefault(); // wajib, agar event 'drop' diizinkan browser
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        });
        sq.addEventListener("drop", (e) => {
          e.preventDefault();
          onSquareClick(idx); // logic sama seperti klik kedua (pilih target / eksekusi move)
        });
        boardEl.appendChild(sq);
      }
    }

    updateSelectionHighlight();
  }

  /* Update highlight seleksi & legal-move TANPA membangun ulang DOM papan.
     Dipanggil setiap kali state.selectedSquare / legalMovesForSelected berubah
     di luar konteks "move sungguhan dieksekusi" (yaitu saat memilih/drag bidak). */
  function updateSelectionHighlight() {
    const boardEl = document.getElementById("chessboard");
    if (!boardEl) return;
    const squares = boardEl.querySelectorAll(".square");
    squares.forEach(sq => {
      sq.classList.remove("selected", "legal-move", "legal-capture");
      const idx = parseInt(sq.dataset.idx, 10);
      if (state.selectedSquare === idx) sq.classList.add("selected");
      const moveHere = state.legalMovesForSelected.find(m => m.to === idx);
      if (moveHere) sq.classList.add(moveHere.capture ? "legal-capture" : "legal-move");
    });
  }

  /* Menghitung legal moves untuk bidak di idx dan meng-update highlight,
     TANPA memanggil renderBoard() / menghapus DOM - aman dipanggil dari
     tengah operasi drag HTML5. */
  function selectSquare(idx) {
    const piece = state.game.pieceAt(idx);
    if (!piece || piece.color !== state.playerColor) return;
    state.selectedSquare = idx;
    const allMoves = state.game.legalMovesFor(idx);
    state.legalMovesForSelected = allMoves.filter(m => !m.promotion || m.promotion === "q");
    updateSelectionHighlight();
  }

  function clearSelection() {
    state.selectedSquare = null;
    state.legalMovesForSelected = [];
    updateSelectionHighlight();
  }

  function onSquareClick(idx) {
    if (!state.gameActive || state.game.turn !== state.playerColor) return;

    const piece = state.game.pieceAt(idx);

    // Jika ada langkah legal ke square ini dari selection, eksekusi.
    // legalMovesForSelected sudah difilter agar promosi hanya berisi opsi Queen.
    const chosenMove = state.legalMovesForSelected.find(m => m.to === idx);
    if (chosenMove) {
      executePlayerMove(chosenMove);
      return;
    }

    // Selection baru (klik langsung atau drag baru dimulai)
    if (piece && piece.color === state.playerColor) {
      selectSquare(idx);
    } else {
      clearSelection();
    }
  }

  function executePlayerMove(move) {
    const wasCapture = !!(state.game.pieceAt(move.to) || move.enPassant);
    const result = state.game.applyMove(move);
    const causesCheck = state.game.inCheck(state.game.turn);
    playSound(pickMoveSound(move, wasCapture, causesCheck));

    state.lastMoveSquares = { from: move.from, to: move.to };
    state.selectedSquare = null;
    state.legalMovesForSelected = [];
    state.moveCount++;
    addMoveToHistory(move);
    applyIncrement("player");
    renderBoard();

    const over = state.game.gameOverReason();
    if (over.over) { endGame(over); return; }

    setTimeout(() => requestBotMove(), 300);
  }

  async function requestBotMove() {
    if (!state.engineReady) return;
    const fen = state.game.toFEN();
    const category = state.timeControl.category;

    // Waktu berpikir proporsional terhadap kategori & sisa waktu jam bot,
    // sama untuk semua kategori (bullet/blitz/rapid) — tidak ada mode "berpikir bebas".
    let thinkTime;
    if (category === "bullet") {
      thinkTime = Math.min(1200, Math.max(300, state.botMs * 0.03));
    } else if (category === "blitz") {
      thinkTime = Math.min(2500, Math.max(500, state.botMs * 0.05));
    } else {
      // rapid
      thinkTime = Math.min(4000, Math.max(800, state.botMs * 0.06));
    }
    const uciMove = await state.engine.getBestMove(fen, thinkTime);

    if (!uciMove || uciMove === "(none)") {
      // Bot tidak punya langkah -> harusnya sudah terdeteksi checkmate/stalemate
      const over = state.game.gameOverReason();
      if (over.over) endGame(over);
      return;
    }
    const from = app.fromAlgebraic(uciMove.slice(0, 2));
    const to = app.fromAlgebraic(uciMove.slice(2, 4));
    const promo = uciMove.length > 4 ? uciMove[4] : null;

    const legalMoves = state.game.legalMovesFor(from);
    let move = legalMoves.find(m => m.to === to && (!promo || m.promotion === promo));
    if (!move) move = legalMoves.find(m => m.to === to); // fallback

    if (!move) {
      console.error("Bot mengirim langkah tidak valid:", uciMove);
      return;
    }

    const wasCapture = !!(state.game.pieceAt(move.to) || move.enPassant);
    state.game.applyMove(move);
    const causesCheck = state.game.inCheck(state.game.turn);
    playSound(pickMoveSound(move, wasCapture, causesCheck));

    state.lastMoveSquares = { from: move.from, to: move.to };
    state.moveCount++;
    addMoveToHistory(move);
    applyIncrement("bot");
    renderBoard();

    const over = state.game.gameOverReason();
    if (over.over) { endGame(over); return; }
  }

  function addMoveToHistory(move) {
    const label = move.castle === "K" ? "O-O" : move.castle === "Q" ? "O-O-O" :
      app.algebraic(move.from) + (move.capture ? "x" : "-") + app.algebraic(move.to) +
      (move.promotion ? "=" + move.promotion.toUpperCase() : "");

    const list = document.getElementById("move-history");
    const isWhiteMove = state.game.turn === "b"; // setelah applyMove, giliran sudah berpindah

    if (isWhiteMove) {
      // Mulai entri baru: "N. <langkah putih>"
      const moveNumber = state.game.fullmoveNumber;
      const li = document.createElement("li");
      li.dataset.moveNumber = moveNumber;
      li.textContent = moveNumber + ". " + label;
      list.appendChild(li);
    } else {
      // Tambahkan langkah hitam ke entri terakhir yang sudah ada
      const lastLi = list.lastElementChild;
      if (lastLi) {
        lastLi.textContent += "  " + label;
      } else {
        // Fallback (seharusnya tidak terjadi): buat entri baru jika belum ada
        const li = document.createElement("li");
        li.textContent = label;
        list.appendChild(li);
      }
    }

    list.parentElement.scrollTop = list.parentElement.scrollHeight;
  }

  /* ---------- CLOCK ---------- */
  function startClock() {
    stopClock();
    state.lastMoveTime = Date.now();
    state.clockInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - state.lastMoveTime;
      state.lastMoveTime = now;
      if (!state.gameActive) return;

      if (state.game.turn === state.playerColor) {
        state.playerMs -= elapsed;
        if (state.playerMs <= 0) {
          state.playerMs = 0;
          updateClocks();
          endGame({ over: true, reason: "timeout", winner: state.playerColor === "w" ? "b" : "w" });
          return;
        }
      } else {
        state.botMs -= elapsed;
        if (state.botMs <= 0) {
          state.botMs = 0;
          updateClocks();
          endGame({ over: true, reason: "timeout", winner: state.playerColor });
          return;
        }
      }
      updateClocks();
    }, 250);
  }

  function stopClock() {
    if (state.clockInterval) clearInterval(state.clockInterval);
    state.clockInterval = null;
  }

  function applyIncrement(who) {
    const incMs = (state.timeControl.inc || 0) * 1000;
    if (incMs === 0) return;
    if (who === "player") state.playerMs += incMs;
    else state.botMs += incMs;
  }

  function formatMs(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function updateClocks() {
    const playerClockEl = document.getElementById("player-clock");
    const opponentClockEl = document.getElementById("opponent-clock");
    playerClockEl.textContent = formatMs(state.playerMs);
    opponentClockEl.textContent = formatMs(state.botMs);
    playerClockEl.classList.toggle("low-time", state.playerMs < 30000);
    opponentClockEl.classList.toggle("low-time", state.botMs < 30000);
  }

  /* ---------- BATALKAN PERTANDINGAN (hanya sebelum langkah pertama) ---------- */
  document.getElementById("cancel-game-btn").addEventListener("click", () => {
    if (!state.gameActive) return;
    if (state.moveCount > 0) {
      alert("Pertandingan hanya bisa dibatalkan sebelum langkah pertama dimainkan.");
      return;
    }
    if (confirm("Batalkan pertandingan ini? Tidak ada perubahan rating.")) {
      state.gameActive = false;
      stopClock();
      enterDashboard();
    }
  });

  /* ---------- RESIGN / DRAW ---------- */
  document.getElementById("resign-btn").addEventListener("click", () => {
    if (!state.gameActive) return;
    if (confirm("Yakin ingin menyerah?")) {
      endGame({ over: true, reason: "resign", winner: state.playerColor === "w" ? "b" : "w" });
    }
  });

  /* ---------- QUIT (keluar saat bermain) ---------- */
  document.getElementById("quit-btn").addEventListener("click", () => {
    if (!state.gameActive) {
      // Jika game sudah selesai, quit langsung kembali ke dashboard tanpa konfirmasi
      enterDashboard();
      return;
    }
    if (confirm("Apakah kamu yakin ingin keluar?")) {
      // Keluar saat pertandingan belum selesai dihitung sebagai kalah bagi
      // pemain, dan Elo tetap diperbarui sesuai hasil tersebut.
      endGame({ over: true, reason: "quit", winner: state.playerColor === "w" ? "b" : "w" });
    }
    // Jika dibatalkan (Cancel), tidak melakukan apa pun - permainan tetap berjalan.
  });

  document.getElementById("draw-btn").addEventListener("click", () => {
    if (!state.gameActive) return;

    if (state.drawOffersUsed >= 1) {
      alert("Penawaran remis sudah habis");
      return;
    }

    state.drawOffersUsed++;

    // Simulasi: bot menerima tawaran remis dengan probabilitas kecil, sisanya menolak
    const accepted = Math.random() < 0.15;
    if (accepted) {
      endGame({ over: true, reason: "draw-agreement", winner: null });
    } else {
      alert(state.bot.name + " menolak tawaran remis.");
    }
  });

  /* ---------- END GAME / ELO UPDATE ---------- */
  function endGame(over) {
    state.gameActive = false;
    stopClock();

    const user = app.getCurrentUser();
    const eloField = eloFieldFor(state.timeControl.category);
    const gameCountField = gameCountFieldFor(state.timeControl.category);

    let result;
    if (over.winner === null) result = "draw";
    else result = over.winner === state.playerColor ? "win" : "loss";

    const currentElo = user[eloField];
    const currentGameCount = user[gameCountField];
    const eloChange = app.calculateEloChange(currentGameCount, result);
    const newElo = Math.max(1320, Math.min(3190, currentElo + eloChange));
    const actualPlayerChange = newElo - currentElo;

    const patch = {
      [eloField]: newElo,
      [gameCountField]: currentGameCount + 1,
      wins: user.wins + (result === "win" ? 1 : 0),
      losses: user.losses + (result === "loss" ? 1 : 0),
      draws: user.draws + (result === "draw" ? 1 : 0)
    };
    app.updateCurrentUser(patch);

    // Perubahan Elo lawan ditampilkan secara simetris (simulasi) - bot tidak
    // punya akun/rating permanen yang disimpan, jadi hanya dicerminkan di
    // profilnya sebagai representasi hasil pertandingan pemain.
    const opponentChange = -actualPlayerChange;

    showResult(newElo, actualPlayerChange, opponentChange);
  }

  /* Tidak ada popup/alert sama sekali - hasil pertandingan ditampilkan
     dengan memperbarui langsung profil pemain & lawan yang sudah ada di
     game-page (angka Elo baru + indikator +/- di sebelahnya), secara
     real-time tanpa perlu reload/refresh halaman. */
  function showResult(newPlayerElo, playerChange, opponentChange) {
    function formatChange(v) {
      if (v > 0) return " +" + v;
      if (v < 0) return " " + v;
      return " ±0";
    }
    function classFor(v) {
      return v > 0 ? "positive" : v < 0 ? "negative" : "neutral";
    }

    // Update angka Elo pemain ke nilai baru + tampilkan indikator perubahan
    document.getElementById("game-player-elo").textContent = newPlayerElo;
    const playerChangeEl = document.getElementById("game-player-elo-change");
    playerChangeEl.textContent = formatChange(playerChange);
    playerChangeEl.classList.remove("positive", "negative", "neutral", "hidden");
    playerChangeEl.classList.add(classFor(playerChange));

    // Elo lawan (bot) tetap ditampilkan apa adanya (bot tidak disimpan permanen),
    // tapi indikator perubahan tetap ditampilkan sebagai cerminan hasil.
    const opponentChangeEl = document.getElementById("game-opponent-elo-change");
    opponentChangeEl.textContent = formatChange(opponentChange);
    opponentChangeEl.classList.remove("positive", "negative", "neutral", "hidden");
    opponentChangeEl.classList.add(classFor(opponentChange));
  }
}

})();

