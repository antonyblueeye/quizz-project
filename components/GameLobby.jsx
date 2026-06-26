"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_LABELS = {
  lobby: "Лобби",
  active: "В игре",
  finished: "Завершена",
};

const CREATE_TOKEN_KEY = (quizId) => `quiz-create-token-${quizId}`;

function formatUpdatedAt(iso) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOrCreateClientToken(quizId) {
  const key = CREATE_TOKEN_KEY(quizId);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const token = crypto.randomUUID();
  sessionStorage.setItem(key, token);
  return token;
}

function clearClientToken(quizId) {
  sessionStorage.removeItem(CREATE_TOKEN_KEY(quizId));
}

export default function GameLobby({ quizId, quizTitle }) {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const createLock = useRef(false);

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/games?quizId=${encodeURIComponent(quizId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setGames(data.games || []);
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadGames();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", loadGames);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", loadGames);
    };
  }, [loadGames]);

  useEffect(() => {
    return () => {
      createLock.current = false;
    };
  }, []);

  const handleNewGame = async () => {
    if (createLock.current || creating) return;

    const unfinished = games.filter((g) => g.started && g.status !== "finished");
    if (unfinished.length > 0) {
      const lines = unfinished
        .map((g) => `• ${g.title} — ${g.progressLabel} (#${g.gameId})`)
        .join("\n");
      const confirmed = window.confirm(
        `В списке ${games.length} ${games.length === 1 ? "игра" : "игры"}, из них ${unfinished.length} незавершённых:\n\n${lines}\n\nСоздать ещё одну новую игру?`
      );
      if (!confirmed) return;
    }

    createLock.current = true;
    setCreating(true);
    const clientToken = getOrCreateClientToken(quizId);
    let navigated = false;

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizTemplateId: quizId, clientToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.game?.gameId) {
        clearClientToken(quizId);
        window.alert(data.error || "Не удалось создать игру. Попробуйте ещё раз.");
        return;
      }
      clearClientToken(quizId);
      navigated = true;
      router.push(`/admin/${quizId}/${data.game.gameId}`);
    } catch {
      clearClientToken(quizId);
      window.alert("Не удалось создать игру. Проверьте соединение и попробуйте снова.");
    } finally {
      if (!navigated) {
        createLock.current = false;
        setCreating(false);
      }
    }
  };

  const handleDelete = async (e, game) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `Удалить игру «${game.title}» (#${game.gameId})?\n\nПрогресс и игроки будут удалены без возможности восстановления.`
    );
    if (!confirmed) return;

    setDeletingId(game.gameId);
    try {
      const res = await fetch(`/api/games/${game.gameId}`, { method: "DELETE" });
      if (!res.ok) {
        window.alert("Не удалось удалить игру. Обновляю список…");
        await loadGames();
        return;
      }
      await loadGames();
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (games.length === 0) return;

    const confirmed = window.confirm(
      `Удалить все ${games.length} ${games.length === 1 ? "игру" : "игры"} для этого квиза?\n\nДействие необратимо.`
    );
    if (!confirmed) return;

    setDeletingId("__all__");
    try {
      const results = await Promise.all(
        games.map((game) =>
          fetch(`/api/games/${game.gameId}`, { method: "DELETE" }).then((res) => ({
            gameId: game.gameId,
            ok: res.ok,
          }))
        )
      );
      const failed = results.filter((r) => !r.ok);
      await loadGames();
      if (failed.length > 0) {
        window.alert(`Не удалось удалить ${failed.length} из ${games.length} игр. Список обновлён.`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="game-lobby-page">
      <Link href="/" className="quiz-admin-back">
        ← Все квизы
      </Link>

      <header className="game-lobby-header">
        <h1 className="home-title">{quizTitle || quizId}</h1>
        <p className="home-subtitle">История игр и новая сессия</p>
        <div className="game-lobby-actions">
          <Link href={`/admin/${quizId}/preview`} className="button button-secondary game-preview-link">
            Структура и превью
          </Link>
          <button
            type="button"
            className="button game-new-btn"
            onClick={handleNewGame}
            disabled={creating}
          >
            {creating ? "Создаём…" : "+ Новая игра"}
          </button>
        </div>
      </header>

      <section className="game-history-section glass-card">
        <div className="game-history-section-head">
          <h2 className="quiz-section-title">Сохранённые игры</h2>
          {games.length > 0 && (
            <button
              type="button"
              className="button button-secondary game-delete-all-btn"
              onClick={handleDeleteAll}
              disabled={deletingId === "__all__"}
            >
              {deletingId === "__all__" ? "Удаляем…" : "Удалить все"}
            </button>
          )}
        </div>
        <p className="quiz-join-hint">
          Каждая строка — отдельная игра со своим ID. Раунды 1–10 идут внутри одной игры;
          новый ID появляется только при «+ Новая игра».
        </p>

        {loading ? (
          <p className="quiz-empty-hint">Загрузка…</p>
        ) : games.length === 0 ? (
          <p className="quiz-empty-hint">Игр пока нет — создайте первую.</p>
        ) : (
          <ul className="game-history-list">
            {games.map((game) => (
              <li key={game.gameId} className="game-history-row">
                <Link href={`/admin/${quizId}/${game.gameId}`} className="game-history-item">
                  <div className="game-history-main">
                    <span className="game-history-title">{game.title}</span>
                    <span className={`game-status-badge game-status-${game.status}`}>
                      {STATUS_LABELS[game.status] || game.status}
                    </span>
                  </div>
                  <p className="game-history-progress">{game.progressLabel}</p>
                  <div className="game-history-meta">
                    <span>{game.playerCount} игроков</span>
                    <span>Обновлено {formatUpdatedAt(game.updatedAt)}</span>
                    <span className="game-history-id">#{game.gameId}</span>
                    <span className="game-history-open">Открыть →</span>
                  </div>
                </Link>
                <button
                  type="button"
                  className="game-history-delete"
                  onClick={(e) => handleDelete(e, game)}
                  disabled={deletingId === game.gameId || deletingId === "__all__"}
                  title="Удалить игру"
                  aria-label={`Удалить игру ${game.title}`}
                >
                  {deletingId === game.gameId ? "…" : "×"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
