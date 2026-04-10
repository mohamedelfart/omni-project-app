import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ForgotPasswordScreen } from '../screens/auth/forgot-password-screen';
import { LoginScreen } from '../screens/auth/login-screen';
import { OtpLoginScreen } from '../screens/auth/otp-login-screen';
import { RegisterScreen } from '../screens/auth/register-screen';
import { CommunityScreen } from '../screens/community/community-screen';
import { BookingConfirmationScreen } from '../screens/finance/booking-confirmation-screen';
import { InsuranceScreen } from '../screens/finance/insurance-screen';
import { PaymentsScreen } from '../screens/finance/payments-screen';
import { RewardsScreen } from '../screens/finance/rewards-screen';
import { ViewingTripScreen } from '../screens/finance/viewing-trip-screen';
import { CompareScreen } from '../screens/properties/compare-screen';
import { MyBookingsScreen } from '../screens/properties/my-bookings-screen';
import { PropertyDetailsScreen } from '../screens/properties/property-details-screen';
import { PropertySearchScreen } from '../screens/properties/property-search-screen';
import { ShortlistScreen } from '../screens/properties/shortlist-screen';
import { ContractsScreen } from '../screens/profile/contracts-screen';
import { ProfileScreen } from '../screens/profile/profile-screen';
import { AirportTransferScreen } from '../screens/services/airport-transfer-screen';
import { CleaningScreen } from '../screens/services/cleaning-screen';
import { MaintenanceScreen } from '../screens/services/maintenance-screen';
import { MoveInScreen } from '../screens/services/move-in-screen';
import { PaidServicesScreen } from '../screens/services/paid-services-screen';
import { ServicesHubScreen } from '../screens/services/services-hub-screen';
import { TenantHomeScreen } from '../screens/tenant/home-screen';
import { VendorScreen } from '../screens/vendor/vendor-screen';

type RootStackParamList = {
  Login: undefined;
  Vendor: undefined;
  Register: undefined;
  OtpLogin: undefined;
  ForgotPassword: undefined;
  TenantHome: undefined;
  PropertySearch: undefined;
  PropertyDetails: undefined;
  MyBookings: undefined;
  Shortlist: undefined;
  Compare: undefined;
  ViewingTrip: undefined;
  BookingConfirmation: undefined;
  Payments: undefined;
  Rewards: undefined;
  Insurance: undefined;
  ServicesHub: undefined;
  MoveIn: undefined;
  Maintenance: undefined;
  Cleaning: undefined;
  AirportTransfer: undefined;
  PaidServices: undefined;
  Community: undefined;
  Profile: undefined;
  Contracts: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const NavigationContainerCompat = NavigationContainer as any;
const StackNavigatorCompat = Stack.Navigator as any;

export function RootNavigator() {
  const initialRouteName: keyof RootStackParamList = 'TenantHome';

  return (
    <NavigationContainerCompat>
      <StackNavigatorCompat
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="TenantHome" component={TenantHomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Vendor" component={VendorScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="OtpLogin" component={OtpLoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="PropertySearch" component={PropertySearchScreen} />
        <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
        <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
        <Stack.Screen name="Shortlist" component={ShortlistScreen} />
        <Stack.Screen name="Compare" component={CompareScreen} />
        <Stack.Screen name="ViewingTrip" component={ViewingTripScreen} />
        <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
        <Stack.Screen name="Payments" component={PaymentsScreen} />
        <Stack.Screen name="Rewards" component={RewardsScreen} />
        <Stack.Screen name="Insurance" component={InsuranceScreen} />
        <Stack.Screen name="ServicesHub" component={ServicesHubScreen} />
        <Stack.Screen name="MoveIn" component={MoveInScreen} />
        <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
        <Stack.Screen name="Cleaning" component={CleaningScreen} />
        <Stack.Screen name="AirportTransfer" component={AirportTransferScreen} />
        <Stack.Screen name="PaidServices" component={PaidServicesScreen} />
        <Stack.Screen name="Community" component={CommunityScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Contracts" component={ContractsScreen} />
      </StackNavigatorCompat>
    </NavigationContainerCompat>
  );
}
