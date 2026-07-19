import React, { useState } from "react";
import "./MagicNavbar.css";

// Define the type for our menu item structures
interface MenuItem {
  id: number;
  name: string;
  iconName: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 0, name: "Home", iconName: "home" },
  { id: 1, name: "Profile", iconName: "person-outline" },
  { id: 2, name: "Message", iconName: "chatbubble-outline" },
  { id: 3, name: "Analytics", iconName: "analytics" },
  { id: 4, name: "Settings", iconName: "settings" },
];

export const MagicNavbar: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  return (
    <div className="navigation">
      <ul>
        {MENU_ITEMS.map((item) => (
          <li
            key={item.id}
            className={`list ${activeIndex === item.id ? "active" : ""}`}
            onClick={() => setActiveIndex(item.id)}
          >
            <a href="#" onClick={(e) => e.preventDefault()}>
              <span className="icon">
                <ion-icon name={item.iconName}></ion-icon>
              </span>
              <span className="text">{item.name}</span>
            </a>
          </li>
        ))}
        {/* Dynamic sliding distance offset rule based on item tab size width (70px) */}
        <div
          className="indicator"
          style={{ transform: `translateX(${70 * activeIndex}px)` }}
        ></div>
      </ul>
    </div>
  );
};
