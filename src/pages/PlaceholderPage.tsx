import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-slate-500">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en préparation</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-slate-600">
            Cette page est déjà connectée au layout principal. On ajoutera
            bientôt la liste, les formulaires, les filtres et les actions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default PlaceholderPage;