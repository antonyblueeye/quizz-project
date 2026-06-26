import React from "react";

function PlayerCell({ name, avatar }) {
  return (
    <span className="leaderboard-player">
      {avatar ? (
        <img src={avatar} alt="" className="player-avatar" />
      ) : (
        <span className="player-avatar player-avatar-fallback">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      {name}
    </span>
  );
}

export default function Leaderboard({ data, title = "Рейтинг" }) {
  return (
    <div className="leaderboard-wrap">
      <h3 className="leaderboard-title">{title}</h3>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Игрок</th>
            <th>Очки</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={3} className="leaderboard-empty">
                Пока нет игроков
              </td>
            </tr>
          ) : (
            data.map((p, idx) => (
              <tr key={p.id}>
                <td>{idx + 1}</td>
                <td>
                  <PlayerCell name={p.name} avatar={p.avatar} />
                </td>
                <td>{p.score}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
