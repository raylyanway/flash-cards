import * as React from "react";
import { CloseNotification, ShowNotification } from "./useNotifications";

const NotificationsContext = React.createContext<{
  show: ShowNotification;
  close: CloseNotification;
} | null>(null);

export default NotificationsContext;
