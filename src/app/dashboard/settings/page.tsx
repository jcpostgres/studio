
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { auth, db, messaging } from '@/lib/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { SettingsCard, SettingsItem, SettingsHeaderCard } from '@/components/settings/settings-card';
import { useTheme } from '@/context/theme-context';
import { 
  Users, 
  FolderKanban, 
  ArrowRightLeft, 
  Landmark, 
  List, 
  FileText, 
  AreaChart,
  Bell,
  Moon,
  HelpCircle,
  LogOut,
  FileCog,
  BarChart2
} from 'lucide-react';
import { getToken, isSupported } from "firebase/messaging";
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


export default function SettingsPage() {
  const { userId, userProfile } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isFcmSupported, setIsFcmSupported] = useState(false);

  useEffect(() => {
      if (typeof window !== 'undefined') {
        isSupported().then(supported => {
            setIsFcmSupported(supported);
            if(supported && Notification.permission === 'granted' && userId) {
                // Check if token exists in DB
                const tokenRef = doc(db, `users/${userId}/fcmTokens`, navigator.userAgent);
                getDoc(tokenRef).then(docSnap => {
                    if (docSnap.exists()) {
                        setNotificationsEnabled(true);
                    }
                });
            } else {
                setNotificationsEnabled(false);
            }
        });
      }
  }, [userId]);


  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };
  
  const handleNotificationToggle = async (checked: boolean) => {
    if (!isFcmSupported || !messaging || !userId) {
        toast({ variant: "destructive", title: "No Soportado", description: "Las notificaciones no son soportadas en este navegador o la configuración de Firebase no está completa."});
        return;
    }

    if (checked) {
        // Enable notifications
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const fcmToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
                if (fcmToken) {
                    const tokenRef = doc(db, `users/${userId}/fcmTokens`, navigator.userAgent);
                    await setDoc(tokenRef, { token: fcmToken, createdAt: new Date().toISOString() });
                    setNotificationsEnabled(true);
                    toast({ title: "¡Éxito!", description: "Notificaciones activadas para este dispositivo." });
                } else {
                     toast({ variant: "destructive", title: "Error", description: "No se pudo obtener el token de notificación." });
                }
            } else {
                toast({ variant: "destructive", title: "Permiso denegado", description: "No se concedió el permiso para las notificaciones." });
            }
        } catch (error) {
            console.error('Error getting notification token:', error);
            toast({ variant: "destructive", title: "Error", description: "Ocurrió un error al activar las notificaciones." });
        }
    } else {
        // Disable notifications
        try {
            const tokenRef = doc(db, `users/${userId}/fcmTokens`, navigator.userAgent);
            await deleteDoc(tokenRef);
            setNotificationsEnabled(false);
            toast({ title: "Notificaciones desactivadas", description: "Ya no recibirás notificaciones en este dispositivo." });
        } catch (error) {
             console.error('Error deleting notification token:', error);
             toast({ variant: "destructive", title: "Error", description: "Ocurrió un error al desactivar las notificaciones." });
        }
    }
  };


  return (
    <>
      <PageHeader
        title="Configuración General"
        description="Gestiona tu perfil, la configuración del sistema y las preferencias de la app."
      />
      <div className="mt-8 grid grid-cols-1 gap-8">
        
        {/* 1. User Profile */}
        <SettingsHeaderCard 
          user={userProfile} 
          onEdit={() => alert('Próximamente: Editar Perfil')} 
        />

        {/* 2. Data Management */}
        <SettingsCard sectionTitle="Gestión de datos">
          <SettingsItem
            icon={<Users className="text-purple-500" />}
            bgColor="bg-purple-500/10"
            title="Nómina"
            subtitle="Gestionar empleados y pagos"
            onClick={() => handleNavigate('/dashboard/payroll')}
          />
          <SettingsItem
            icon={<FolderKanban className="text-blue-500" />}
            bgColor="bg-blue-500/10"
            title="Clientes y Deudas"
            subtitle="Estado de cuentas por cobrar"
            onClick={() => handleNavigate('/dashboard/clients-debts')}
          />
          <SettingsItem
            icon={<FileCog className="text-indigo-500" />}
            bgColor="bg-indigo-500/10"
            title="Pagos Administrativos"
            subtitle="Servicios, alquileres y más"
            onClick={() => handleNavigate('/dashboard/admin-payments')}
          />
        </SettingsCard>
        
        {/* 3. System Configuration */}
        <SettingsCard sectionTitle="Configuración del sistema">
          <SettingsItem
            icon={<Landmark className="text-teal-500" />}
            bgColor="bg-teal-500/10"
            title="Configurar Cuentas"
            subtitle="Gestionar cuentas y comisiones"
            onClick={() => handleNavigate('/dashboard/accounts')}
          />
          <SettingsItem
            icon={<List className="text-green-500" />}
            bgColor="bg-green-500/10"
            title="Categorías y Listas"
            subtitle="Gestionado en cada sección"
          />
        </SettingsCard>

        {/* 4. Advanced Reports */}
        <SettingsCard sectionTitle="Informes Avanzados">
           <SettingsItem
            icon={<BarChart2 className="text-cyan-500" />}
            bgColor="bg-cyan-500/10"
            title="Reporte de Servicios"
            subtitle="Analiza tus servicios más vendidos"
            onClick={() => handleNavigate('/dashboard/service-report')}
          />
          <SettingsItem
            icon={<FileText className="text-red-500" />}
            bgColor="bg-red-500/10"
            title="Exportar Datos"
            subtitle="Descargar reportes CSV desde Total General"
            onClick={() => handleNavigate('/dashboard/total-general')}
          />
        </SettingsCard>

        {/* 5. App Preferences */}
        <SettingsCard sectionTitle="Preferencias de la App">
          <SettingsItem
            icon={<Bell className="text-gray-500" />}
            bgColor="bg-gray-500/10"
            title="Notificaciones"
            subtitle={!isFcmSupported ? "No soportado en este navegador" : (notificationsEnabled ? "Activadas" : "Desactivadas")}
            isSwitch
            switchState={notificationsEnabled}
            onSwitchChange={handleNotificationToggle}
            disabled={!isFcmSupported}
          />
          <SettingsItem
            icon={<Moon className="text-gray-500" />}
            bgColor="bg-gray-500/10"
            title="Modo Oscuro"
            subtitle="Apariencia de la aplicación"
            isSwitch
            switchState={theme === 'dark'}
            onSwitchChange={toggleTheme}
          />
        </SettingsCard>

         {/* 6. Support */}
        <SettingsCard sectionTitle="Soporte">
          <SettingsItem
            icon={<HelpCircle className="text-cyan-500" />}
            bgColor="bg-cyan-500/10"
            title="Ayuda y Soporte"
            subtitle="Preguntas frecuentes y contacto"
            isComingSoon
          />
          <SettingsItem
            icon={<LogOut className="text-red-500" />}
            bgColor="bg-red-500/10"
            title="Cerrar Sesión"
            subtitle="Salir de la aplicación"
            onClick={handleLogout}
            isDestructive
          />
        </SettingsCard>
      </div>
    </>
  );
}
