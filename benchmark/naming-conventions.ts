
// Test file with naming convention issues
class UserManager {
  // Private property without underscore
  private userId: string;
  private userRole: string;

  // Constructor with unused parameter
  constructor(userId: string, userRole: string, config: any) {
    this.userId = userId;
    this.userRole = userRole;
  }

  // Method with snake_case parameter
  public getUserDetails(user_id: string, include_metadata: boolean) {
    return {
      id: user_id,
      role: this.userRole,
      metadata: include_metadata ? { lastLogin: new Date() } : undefined
    };
  }
}

// Enum with uppercase members
enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended"
}

// Interface without I prefix
interface UserData {
  id: string;
  role: string;
  status: UserStatus;
  last_login_date: Date;
}
