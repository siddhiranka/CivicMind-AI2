import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Mail, Calendar, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!user) return null;

  const isOfficer = user.role === 'officer';

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl pb-safe">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header Card */}
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 ${isOfficer ? 'bg-blue-500/10' : 'bg-green-500/10'} rounded-full blur-3xl -mr-10 sm:-mr-20 -mt-10 sm:-mt-20`} />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg shrink-0 ${isOfficer ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{user.name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wide w-fit mx-auto md:mx-0 ${isOfficer ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                  {isOfficer ? (
                    <>
                      <ShieldCheck size={14} className="text-blue-400" />
                      🔷 {t('profile.officerBadge', 'Verified Government Officer')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      🟢 {t('profile.citizenBadge', 'Citizen')}
                    </>
                  )}
                </span>
              </div>

              <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 text-sm sm:text-base break-all">
                <Mail size={16} className="shrink-0" /> {user.email}
              </p>

              <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center md:justify-start gap-1.5">
                <Calendar size={14} /> {t('profile.memberSince', 'Member since 2026')}
              </p>
            </div>
          </div>
        </div>

        {/* Details & Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Award className="text-primary" size={20} />
              {t('profile.accountInfo', 'Account Information')}
            </h3>

            <div className="space-y-3 sm:space-y-4 text-sm sm:text-base">
              <div className="flex justify-between items-center py-3 sm:py-2 border-b border-border min-h-[44px]">
                <span className="text-muted-foreground">{t('profile.userRole', 'User Role')}</span>
                <span className="font-semibold capitalize">{user.role}</span>
              </div>
              <div className="flex justify-between items-center py-3 sm:py-2 border-b border-border min-h-[44px]">
                <span className="text-muted-foreground">{t('profile.systemStatus', 'Status')}</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Active
                </span>
              </div>
              <div className="flex justify-between items-center py-3 sm:py-2 border-b border-border min-h-[44px] gap-4">
                <span className="text-muted-foreground shrink-0">{t('profile.accessLevel', 'Access Level')}</span>
                <span className="font-semibold text-right">
                  {isOfficer ? 'Administrative & Review' : 'Public Citizen Access'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="text-primary" size={20} />
                {t('profile.quickActions', 'Quick Actions')}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                {isOfficer 
                  ? t('profile.officerDesc', 'Manage civic complaints, review incoming issues, assign departments, and track resolution metrics.')
                  : t('profile.citizenDesc', 'Report infrastructure issues, track complaint timelines, and monitor community health scores.')}
              </p>
            </div>

            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full min-h-[48px] py-3 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-md text-base"
            >
              {t('nav.dashboard', 'Go to Dashboard')}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
