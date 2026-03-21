import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import RegisterForm from "../../components/auth/RegisterForm";

export default function Register() {
  return (
    <>
      <PageMeta
        title="HisabKitab Register | Create Super Admin Account"
        description="Register for HisabKitab Super Admin Panel to access company management tools."
      />
      <AuthLayout>
        <RegisterForm />
      </AuthLayout>
    </>
  );
}
