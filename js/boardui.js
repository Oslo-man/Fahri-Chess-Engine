var g_startOffset = null;
var g_selectedPiece = null;
var moveNumber = 1;

var g_allMoves = [];
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
    1: { name: "Fahri mengajar", sub: "Fahri (1200+ Elo)" },
    2: { name: "Fahri tidak fokus", sub: "Fahri (1900+ Elo)" },
    3: { name: "Fahri serius",  sub: "Fahri (2200+ Elo)" }
};

// Board cell size calculated dynamically from screen width
var g_cellSize = Math.max(36, Math.min(52, Math.floor((Math.min(window.innerWidth, screen.width) - 8) / 8)));

// Mode: 'friendly' or 'challenge'
var g_mode = 'friendly';

// ── CHANGE LEVEL ──────────────────────────────────────────────────────────────
function UIChangeLevel() {
    var sel = document.getElementById("LevelSelect");
    g_engineLevel = parseInt(sel.value, 10);

    var info = g_engineInfo[g_engineLevel];
    var nameEl = document.getElementById("engineName");
    var subEl  = document.getElementById("engineSub");
    if (nameEl) nameEl.textContent = info.name;
    if (subEl)  subEl.textContent  = info.sub;

    if (g_backgroundEngine != null) {
        g_backgroundEngine.terminate();
        g_backgroundEngine = null;
    }
    g_backgroundEngineValid = true;
    UINewGame();
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

    var evalBar   = document.getElementById('evalBarContainer');
    var btnUndo   = document.getElementById('btnUndo');
    var btnAnal   = document.getElementById('AnalysisToggleLink');
    var timeRow   = document.getElementById('timeRow');
    var statusBar = document.getElementById('output');

    var show = (mode === 'friendly');
    if (evalBar)   evalBar.style.display   = show ? 'flex'        : 'none';
    if (btnUndo)   btnUndo.style.display   = show ? 'inline-flex' : 'none';
    if (btnAnal)   btnAnal.style.display   = show ? 'inline-flex' : 'none';
    if (timeRow)   timeRow.style.display   = show ? 'flex'        : 'none';
    if (statusBar) statusBar.style.display = show ? 'block'       : 'none';

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
    moveNumber = 1;

    var pgnTextBox = document.getElementById("PgnTextBox");
    pgnTextBox.value = "";

    EnsureAnalysisStopped();
    ResetGame();
    if (InitializeBackgroundEngine()) {
        g_backgroundEngine.postMessage("go");
    }
    g_allMoves = [];
    RedrawBoard();
    UpdateEvalBar(0);

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
            UpdateEvalBar(0);
        }
        g_analyzing = !g_analyzing;
        document.getElementById("AnalysisToggleLink").innerText = g_analyzing ? "Analisis: Hidup" : "Analisis: Mati";
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

        EnsureAnalysisStopped();
        InitializeBackgroundEngine();

        g_playerWhite = !!g_toMove;
        g_backgroundEngine.postMessage("position " + GetFen());

        RedrawBoard();
    }
}

function UIChangeStartPlayer() {
    g_playerWhite = !g_playerWhite;
    RedrawBoard();
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
        alert("Skakmat!");
    }
}

function UIPlayMove(move, pv) {
    UpdatePgnTextBox(move);
    g_allMoves[g_allMoves.length] = move;
    MakeMove(move);
    UpdatePVDisplay(pv);
    UpdateFromMove(move);
}

function UIUndoMove() {
    if (g_allMoves.length == 0) return;

    if (g_backgroundEngine != null) {
        g_backgroundEngine.terminate();
        g_backgroundEngine = null;
    }

    UnmakeMove(g_allMoves[g_allMoves.length - 1]);
    g_allMoves.pop();

    if (g_playerWhite != !!g_toMove && g_allMoves.length != 0) {
        UnmakeMove(g_allMoves[g_allMoves.length - 1]);
        g_allMoves.pop();
    }

    RedrawBoard();
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

        if (g_analyzing) {
            var match = pv.match(/Score:(-?\d+)/);
            if (match) {
                var score = parseInt(match[1], 10);
                if (g_toMove === 0) score = -score;
                UpdateEvalBar(score);
            }
        }
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

function UpdateFromMove(move) {
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
        $(g_uiBoard[toY * 8 + toX])
            .empty()
            .append($(fromSquare).children());
    }
}

function RedrawPieces() {
    for (y = 0; y < 8; ++y) {
        for (x = 0; x < 8; ++x) {
            var td = g_uiBoard[y * 8 + x];
            var pieceY = g_playerWhite ? y : 7 - y;
            var piece = g_board[((pieceY + 2) * 0x10) + (g_playerWhite ? x : 7 - x) + 4];
            var pieceName = null;
            switch (piece & 0x7) {
                case piecePawn:   pieceName = "pawn";   break;
                case pieceKnight: pieceName = "knight"; break;
                case pieceBishop: pieceName = "bishop"; break;
                case pieceRook:   pieceName = "rook";   break;
                case pieceQueen:  pieceName = "queen";  break;
                case pieceKing:   pieceName = "king";   break;
            }
            if (pieceName != null) {
                pieceName += "_";
                pieceName += (piece & 0x8) ? "white" : "black";
            }

            if (pieceName != null) {
                var img = document.createElement("div");
                $(img).addClass('sprite-' + pieceName);
                img.style.backgroundImage = "url('img/sprites.png')";
                img.width = g_cellSize;
                img.height = g_cellSize;
                var divimg = document.createElement("div");
                divimg.appendChild(img);

                $(divimg).draggable({ start: function (e, ui) {
                    if ((g_playerWhite && g_toMove === 0) || (!g_playerWhite && g_toMove !== 0)) {
                        return false;
                    }
                    if (g_selectedPiece === null) {
                        g_selectedPiece = this;
                        var offset = $(this).closest('table').offset();
                        g_startOffset = {
                            left: e.pageX - offset.left,
                            top: e.pageY - offset.top
                        };
                    } else {
                        return g_selectedPiece == this;
                    }
                }});

                $(divimg).mousedown(function(e) {
                    if ((g_playerWhite && g_toMove === 0) || (!g_playerWhite && g_toMove !== 0)) {
                        return;
                    }
                    if (g_selectedPiece === null) {
                        var offset = $(this).closest('table').offset();
                        g_startOffset = {
                            left: e.pageX - offset.left,
                            top: e.pageY - offset.top
                        };
                        e.stopPropagation();
                        g_selectedPiece = this;
                        g_selectedPiece.style.backgroundImage = "url('img/transpBlue50.png')";
                    } else if (g_selectedPiece === this) {
                        g_selectedPiece.style.backgroundImage = null;
                        g_selectedPiece = null;
                    }
                });

                $(td).empty().append(divimg);
            } else {
                $(td).empty();
            }
        }
    }
}

function RedrawBoard() {
    var div = $("#board")[0];

    var table = document.createElement("table");
    table.cellPadding = "0px";
    table.cellSpacing = "0px";
    $(table).addClass('no-highlight');

    var tbody = document.createElement("tbody");
    g_uiBoard = [];

    var dropPiece = function (e, ui) {
        var endX = e.pageX - $(table).offset().left;
        var endY = e.pageY - $(table).offset().top;

        endX = Math.floor(endX / g_cellSize);
        endY = Math.floor(endY / g_cellSize);

        var startX = Math.floor(g_startOffset.left / g_cellSize);
        var startY = Math.floor(g_startOffset.top / g_cellSize);

        if (!g_playerWhite) {
            startY = 7 - startY;
            endY   = 7 - endY;
            startX = 7 - startX;
            endX   = 7 - endX;
        }

        var moves = GenerateValidMoves();
        var move = null;
        for (var i = 0; i < moves.length; i++) {
            if ((moves[i] & 0xFF) == MakeSquare(startY, startX) &&
                ((moves[i] >> 8) & 0xFF) == MakeSquare(endY, endX)) {
                move = moves[i];
            }
        }

        if (!g_playerWhite) {
            startY = 7 - startY;
            endY   = 7 - endY;
            startX = 7 - startX;
            endX   = 7 - endX;
        }

        g_selectedPiece.style.left = 0;
        g_selectedPiece.style.top  = 0;

        if (!(startX == endX && startY == endY) && move != null) {
            UpdatePgnTextBox(move);

            if (InitializeBackgroundEngine()) {
                g_backgroundEngine.postMessage(FormatMove(move));
            }

            g_allMoves[g_allMoves.length] = move;
            MakeMove(move);
            UpdateFromMove(move);

            g_selectedPiece.style.backgroundImage = null;
            g_selectedPiece = null;

            document.getElementById("FenTextBox").value = GetFen();
            setTimeout("SearchAndRedraw()", 0);
        } else {
            g_selectedPiece.style.backgroundImage = null;
            g_selectedPiece = null;
        }
    };

    for (y = 0; y < 8; ++y) {
        var tr = document.createElement("tr");
        for (x = 0; x < 8; ++x) {
            var td = document.createElement("td");
            td.style.width  = g_cellSize + "px";
            td.style.height = g_cellSize + "px";
            var isDark = ((y ^ x) & 1);
            td.className = isDark ? 'board-dark' : 'board-light';
            if (g_mode === 'challenge') {
                td.style.backgroundColor = isDark ? "#8b4040" : "#e8b4a0";
            } else {
                td.style.backgroundColor = isDark ? "#B58863" : "#F0D9B5";
            }
            tr.appendChild(td);
            g_uiBoard[y * 8 + x] = td;
        }
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);

    $('body').droppable({ drop: dropPiece });
    $(table).mousedown(function(e) {
        if (g_selectedPiece !== null) {
            dropPiece(e);
        }
    });

    RedrawPieces();
    $(div).empty();
    div.appendChild(table);

    g_changingFen = true;
    document.getElementById("FenTextBox").value = GetFen();
    g_changingFen = false;
}