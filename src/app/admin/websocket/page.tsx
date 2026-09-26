import { AdminHeader } from "wbl/app/admin/_components/ui";
import { WsConnections } from "wbl/app/admin/websocket/_components/WsConnections";
import { WsMessageLog } from "wbl/app/admin/websocket/_components/WsMessageLog";

export const dynamic = "force-dynamic";

export default function AdminWebsocketPage() {
  return (
    <>
      <AdminHeader
        title="WebSocket-Debugger"
        description="Offene Verbindungen auf /ws und alle ein- und ausgehenden Nachrichten, live."
      />
      <WsConnections />
      <WsMessageLog className="h-[32rem]" />
    </>
  );
}
