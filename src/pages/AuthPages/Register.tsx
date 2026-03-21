import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import RegisterForm from "../../components/auth/RegisterForm";

export default function Register() {
  return (
    <>
      <PageMeta
        title="Company-Admin Register | Create Super Admin Account"
        description="Register for Company-Admin Super Admin Panel to access company management tools."
      />
      <AuthLayout>
        <RegisterForm />
      </AuthLayout>
    </>
  );
}
