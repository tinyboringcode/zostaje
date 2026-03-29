"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { IconMenu2, IconX } from "@tabler/icons-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<"div">) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
};

export const DesktopSidebar = ({ className, children, ...props }: React.ComponentProps<"div">) => {
  const { open } = useSidebar();
  return (
    <div
      className={cn("h-full px-3 py-4 hidden md:flex md:flex-col shrink-0 overflow-hidden", className)}
      style={{ width: open ? "240px" : "60px", transition: "width 200ms ease" }}
      {...props}
    >
      {children}
    </div>
  );
};

export const MobileSidebar = ({ className, children, ...props }: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className={cn("h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between w-full")}
      {...props}
    >
      <div className="flex justify-end z-20 w-full">
        <IconMenu2 className="cursor-pointer" onClick={() => setOpen(!open)} />
      </div>
      {open && (
        <div
          className={cn(
            "fixed h-full w-full inset-0 bg-white p-10 z-[100] flex flex-col justify-between",
            className
          )}
        >
          <div className="absolute right-10 top-10 z-50 cursor-pointer" onClick={() => setOpen(false)}>
            <IconX />
          </div>
          {children}
        </div>
      )}
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  [key: string]: unknown;
}) => {
  const { open } = useSidebar();
  return (
    <a
      href={link.href}
      className={cn("flex items-center gap-2 py-2 group/sidebar", className)}
      {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
    >
      {link.icon}
      <span
        style={{ display: open ? "inline-block" : "none" }}
        className="text-neutral-700 text-sm whitespace-pre !p-0 !m-0"
      >
        {link.label}
      </span>
    </a>
  );
};
