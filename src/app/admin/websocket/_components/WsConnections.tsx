"use client";

import { EmptyState, ErrorState } from "wbl/app/_components/ui/states";
import { formatDateTime } from "wbl/app/admin/_components/format";
import { Badge } from "wbl/app/admin/_components/ui";
import { api } from "wbl/trpc/react";

/** Open WebSocket connections and their controller, polled every second. */
export function WsConnections() {
  const connections = api.admin.websocket.connections.useQuery(undefined, {
    refetchInterval: 1000,
    refetchIntervalInBackground: false,
  });

  if (connections.isError && !connections.data) {
    return (
      <ErrorState
        message="Verbindungen konnten nicht geladen werden."
        onRetry={() => void connections.refetch()}
      />
    );
  }

  const data = connections.data;

  return (
    <section
      aria-labelledby="ws-connections-title"
      className="flex flex-col gap-2"
    >
      <h2 id="ws-connections-title" className="text-lg font-semibold">
        Verbindungen
        <span className="ml-2 font-normal text-white/50">
          {data ? data.length : "…"}
        </span>
      </h2>
      {data?.length === 0 ? (
        <EmptyState icon="Network">Gerade ist niemand verbunden.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-1 rounded-2xl border border-white/10 p-1">
          {data?.map((connection) => (
            <li
              key={connection.id}
              className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold">
                  <span className="font-mono">{connection.id}</span>
                  {connection.controller ? (
                    <Badge tone="green">
                      Controller{" "}
                      {connection.controller.name ??
                        `#${connection.controller.hardwareId}`}
                    </Badge>
                  ) : (
                    <Badge>nicht zugeordnet</Badge>
                  )}
                </p>
                <p className="truncate text-xs text-white/50">
                  {connection.remoteAddress ?? "unbekannte Adresse"}
                  {connection.userAgent && ` · ${connection.userAgent}`}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-white/60 tabular-nums">
                seit {formatDateTime(connection.connectedAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
