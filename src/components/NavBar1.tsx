import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { useState } from "react";

// const NAV_ITEMS: Array<{
//   screen: Screen;
//   label: string;
//   icon: typeof HomeRounded;
// }> = [
//   { screen: "home", label: "Home", icon: HomeRounded },
//   { screen: "content", label: "Content", icon: StorageRounded },
//   { screen: "analytics", label: "Analytics", icon: AnalyticsRounded },
//   { screen: "settings", label: "Settings", icon: SettingsRounded },
//   { screen: "library", label: "Library", icon: BookRounded },
// ];

const drawerWidth = 240;
const navItems = ["Home", "About", "Contact"];

export function NavBar() {
  // const screen = useAppStore((state) => state.screen);
  // const setScreen = useAppStore((state) => state.setScreen);
  // const [isOpen, setIsOpen] = useState(false);
  // const theme = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        Flash Cards
      </Typography>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item} disablePadding>
            <ListItemButton sx={{ textAlign: "center" }}>
              <ListItemText primary={item} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
  // const mobile = useMediaQuery(theme.breakpoints.down("md"));

  // const handleClick = (nextScreen: Screen) => {
  //   setScreen(nextScreen);
  //   setIsOpen(false);
  // };

  // const navButtons = NAV_ITEMS.map(
  //   ({ screen: itemScreen, label, icon: Icon }) => (
  //     <Button
  //       key={itemScreen}
  //       color={screen === itemScreen ? "primary" : "inherit"}
  //       variant={screen === itemScreen ? "contained" : "text"}
  //       startIcon={<Icon fontSize="small" />}
  //       onClick={() => handleClick(itemScreen)}
  //       sx={{
  //         borderRadius: 1,
  //         px: 2,
  //         py: 0.75,
  //         minWidth: 0,
  //         fontWeight: 600,
  //       }}
  //     >
  //       {label}
  //     </Button>
  //   ),
  // );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar component="nav">
        <Toolbar sx={{ justifyContent: "end" }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Flash Cards
          </Typography>
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            {navItems.map((item) => (
              <Button key={item} sx={{ color: "#fff" }}>
                {item}
              </Button>
            ))}
          </Box>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            sx={{ display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <nav>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </nav>
      <Box component="main" sx={{ p: 3 }}>
        <Toolbar />
      </Box>
    </Box>
    // <AppBar component="nav">
    //   <Toolbar
    //     sx={{
    //       width: "min(1200px, calc(100% - 32px))",
    //       mx: "auto",
    //       minHeight: 72,
    //     }}
    //   >
    //     <Stack component="nav" direction="row" sx={{ width: "100%" }}>
    //       <Box>
    //         <Stack direction="row" spacing={1.25} alignItems="center">
    //           <Box
    //             sx={{
    //               width: 30,
    //               height: 30,
    //               borderRadius: 2,
    //               bgcolor: "primary.main",
    //               color: "primary.contrastText",
    //               display: "grid",
    //               placeItems: "center",
    //               fontSize: 15,
    //               fontWeight: 900,
    //               transform: "rotate(-8deg)",
    //             }}
    //           >
    //             f
    //           </Box>
    //           <Box>
    //             <Typography
    //               variant="h6"
    //               component="div"
    //               sx={{
    //                 fontWeight: 800,
    //                 lineHeight: 1,
    //                 letterSpacing: "-0.03em",
    //               }}
    //             >
    //               Flash Cards
    //             </Typography>
    //             <Typography
    //               variant="caption"
    //               sx={{
    //                 color: "text.secondary",
    //                 letterSpacing: "0.08em",
    //                 textTransform: "uppercase",
    //               }}
    //             >
    //               Learn deliberately
    //             </Typography>
    //           </Box>
    //         </Stack>
    //       </Box>

    //       {mobile ? (
    //         <>
    //           <IconButton
    //             color="inherit"
    //             aria-label={isOpen ? "Close navigation" : "Open navigation"}
    //             aria-expanded={isOpen}
    //             onClick={() => setIsOpen((current) => !current)}
    //             sx={{ border: "1px solid", borderColor: "divider" }}
    //           >
    //             <MenuRounded />
    //           </IconButton>
    //           <Drawer
    //             anchor="top"
    //             open={isOpen}
    //             onClose={() => setIsOpen(false)}
    //           >
    //             <List sx={{ px: 1, py: 2 }}>
    //               {NAV_ITEMS.map(
    //                 ({ screen: itemScreen, label, icon: Icon }) => (
    //                   <ListItemButton
    //                     key={itemScreen}
    //                     selected={screen === itemScreen}
    //                     onClick={() => handleClick(itemScreen)}
    //                   >
    //                     <Box component={Icon} sx={{ mr: 1.5 }} />
    //                     <ListItemText primary={label} />
    //                   </ListItemButton>
    //                 ),
    //               )}
    //             </List>
    //           </Drawer>
    //         </>
    //       ) : (
    //         <Stack direction="row" spacing={1}>
    //           {navButtons}
    //         </Stack>
    //       )}
    //     </Stack>
    //   </Toolbar>
    // </AppBar>
  );
}
