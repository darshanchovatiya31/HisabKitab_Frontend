import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="HisabKitab Sign In | Professional Bookkeeping"
        description="Sign in to the HisabKitab Dashboard for secure access to company management tools."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}