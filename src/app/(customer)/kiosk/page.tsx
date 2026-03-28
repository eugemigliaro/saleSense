import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const kioskTickets = [
  "Idle media shell and tap-to-wake interaction",
  "Typed chat UI for Milestone 1",
  "Lead capture and reset-to-idle flow",
  "Voice and face detection only in later milestones",
];

export default function KioskPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#efe5d6_0%,#dbd1bf_35%,#b8afa2_100%)] px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-foreground/65">
            Customer Surface
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance">
            Kiosk route scaffold
          </h1>
          <p className="max-w-2xl text-base leading-7 text-foreground/70">
            This route is the dedicated customer-facing experience. Keep it
            visually direct, full-screen friendly, and milestone aligned.
          </p>
        </header>

        <Card className="max-w-xl border-black/10 bg-white/75 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>Reserved work for Dev C</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
              {kioskTickets.map((ticket) => (
                <li key={ticket} className="flex gap-3">
                  <span className="mt-2 size-2 rounded-full bg-foreground/70" />
                  <span>{ticket}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
