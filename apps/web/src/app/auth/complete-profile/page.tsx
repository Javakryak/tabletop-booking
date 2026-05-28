import { ProfileCompletionForm } from "@/components/auth/profile-completion-form";

export default function CompleteProfilePage() {
  return (
    <section className="space-y-4">
      <p className="mx-auto max-w-xl rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
        Статус: профиль не завершен. Для продолжения нужно заполнить профиль и
        принять обязательные согласия.
      </p>
      <ProfileCompletionForm />
    </section>
  );
}
