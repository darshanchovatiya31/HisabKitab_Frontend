import { useState, useEffect, type FormEvent } from "react";
import { Eye, EyeOff, Calendar } from "lucide-react";
import swal from '../utils/swalHelper';
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Form from "../components/form/Form";
import apiService from "../services/api";
import { useAuth } from "../context/AuthContext";

interface UserProfile {
  email: string;
  name: string;
  role: string;
  joinDate: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserProfiles() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile>({
    email: "",
    name: "",
    role: "",
    joinDate: ""
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: ""
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [, setErrors] = useState({
    profile: "",
    password: "",
    general: ""
  });

  const [isLoading, setIsLoading] = useState({
    profile: false,
    password: false
  });

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiService.getCompanyProfile();

        if (response.status === 200 && response.data?.user) {
          const userData = response.data.user;
          setUserProfile({
            email: userData.email || '',
            name: userData.name,
            role: userData.role,
            joinDate: userData.createdAt
          });
          setProfileForm({
            name: userData.name,
            email: userData.email || ''
          });
        } else {
          setErrors(prev => ({ ...prev, general: response.message || "Failed to load profile" }));
          swal.error('Error', response.message || 'Failed to load profile');
        }
      } catch (error: any) {
        setErrors(prev => ({ ...prev, general: "Failed to load profile. Please try again." }));
        swal.error('Error', 'Failed to load profile. Please try again.');
      }
    };

    fetchProfile();
  }, [user]);

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Handle profile update (name and email)
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(prev => ({ ...prev, profile: true }));
    setErrors(prev => ({ ...prev, profile: "" }));

    // Validation
    if (!profileForm.name || !profileForm.email) {
      setErrors(prev => ({ ...prev, profile: "Name and email are required" }));
      setIsLoading(prev => ({ ...prev, profile: false }));
      swal.error('Error', 'Name and email are required');
      return;
    }

    if (!validateEmail(profileForm.email)) {
      setErrors(prev => ({ ...prev, profile: "Please enter a valid email address" }));
      setIsLoading(prev => ({ ...prev, profile: false }));
      swal.error('Error', 'Please enter a valid email address');
      return;
    }

    try {
      const response = await apiService.updateCompanyProfile({
        name: profileForm.name,
        email: profileForm.email
      });

      if (response.status === 200 && response.data?.user) {
        const updatedUser = response.data.user;

        setUserProfile(prev => ({
          ...prev,
          name: updatedUser.name,
          email: updatedUser.email || ''
        }));

        // Update localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            userData.name = updatedUser.name;
            userData.email = updatedUser.email || '';
            localStorage.setItem('user', JSON.stringify(userData));
          } catch (e) {
            console.error('Error updating localStorage:', e);
          }
        }

        swal.success('Success', 'Profile updated successfully!');
        window.dispatchEvent(new Event('userUpdated'));
      } else {
        setErrors(prev => ({ ...prev, profile: response.message || "Failed to update profile" }));
        swal.error('Error', response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, profile: error.message || "Failed to update profile. Please try again." }));
      swal.error('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, profile: false }));
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(prev => ({ ...prev, password: true }));
    setErrors(prev => ({ ...prev, password: "" }));

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      const errorMsg = "All fields are required";
      setErrors(prev => ({ ...prev, password: errorMsg }));
      setIsLoading(prev => ({ ...prev, password: false }));
      swal.error('Error', errorMsg);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      const errorMsg = "Password must be at least 6 characters";
      setErrors(prev => ({ ...prev, password: errorMsg }));
      setIsLoading(prev => ({ ...prev, password: false }));
      swal.error('Error', errorMsg);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      const errorMsg = "Passwords do not match";
      setErrors(prev => ({ ...prev, password: errorMsg }));
      setIsLoading(prev => ({ ...prev, password: false }));
      swal.error('Error', errorMsg);
      return;
    }

    try {
      const response = await apiService.changeCompanyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (response.status === 200) {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        swal.success('Success', 'Password changed successfully!');
      } else {
        setErrors(prev => ({ ...prev, password: response.message || "Failed to change password" }));
        swal.error('Error', response.message || 'Failed to change password');
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, password: error.message || "Failed to change password" }));
      swal.error('Error', error.message || 'Failed to change password');
    } finally {
      setIsLoading(prev => ({ ...prev, password: false }));
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white font-semibold text-xl">
            {getInitials(userProfile.name || '')}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userProfile.name || 'Profile'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400">
                {userProfile.role}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Joined {userProfile.joinDate ? new Date(userProfile.joinDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Update Profile</h3>
          <Form onSubmit={handleProfileUpdate}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading.profile}
              className="mt-6 w-full px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              Update Profile
            </button>
          </Form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Change Password</h3>
          <Form onSubmit={handlePasswordChange}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPasswords.current ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPasswords.new ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPasswords.confirm ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading.password}
              className="mt-6 w-full px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              Change Password
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}