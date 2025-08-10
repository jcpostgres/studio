
"use client";

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
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

export default function SettingsPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };
  
  // Placeholder for switch logic
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

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
            isComingSoon // Keeping this as "coming soon" visually but it's conceptually handled
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
            subtitle="Generar reportes Excel/PDF"
            isComingSoon
          />
        </SettingsCard>

        {/* 5. App Preferences */}
        <SettingsCard sectionTitle="Preferencias de la App">
          <SettingsItem
            icon={<Bell className="text-gray-500" />}
            bgColor="bg-gray-500/10"
            title="Notificaciones"
            subtitle="Recordatorios y alertas"
            isSwitch
            switchState={notificationsEnabled}
            onSwitchChange={setNotificationsEnabled}
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
