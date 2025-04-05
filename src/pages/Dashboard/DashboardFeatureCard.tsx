import React from 'react';
    import { Link } from 'react-router-dom';
    import { LucideIcon, ArrowRight } from 'lucide-react';
    import Card from '../../components/Card'; // Adjusted import path

    interface DashboardFeatureCardProps {
      name: string;
      description: string;
      icon: LucideIcon;
      href: string;
      color: string;
    }

    const DashboardFeatureCard: React.FC<DashboardFeatureCardProps> = ({
      name,
      description,
      icon: Icon, // Rename prop to avoid conflict
      href,
      color,
    }) => {
      return (
        <Link to={href}>
          <Card className="h-full hover:shadow-lg hover:shadow-gray-700 transition-shadow">
            <div className="flex flex-col h-full">
              <div className="flex items-center mb-4">
                <div className={`p-2 rounded-md ${color}`}>
                  <Icon className="h-6 w-6" /> {/* Use renamed prop */}
                </div>
                <h3 className="ml-3 text-lg font-medium text-white">{name}</h3>
              </div>
              <p className="text-gray-400 text-sm flex-grow">{description}</p>
              <div className="mt-4 flex items-center text-white text-sm font-medium">
                <span>Get started</span>
                <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </div>
          </Card>
        </Link>
      );
    };

    export default DashboardFeatureCard;
