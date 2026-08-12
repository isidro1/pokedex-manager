import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    redirectTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const redirectTo = params?.redirectTo?.startsWith("/") ? params.redirectTo : "/dashboard";

  return <LoginForm redirectTo={redirectTo} />;
}