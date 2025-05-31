interface PageHeaderProps {
    title: string;
    subtitle: string;
  }
  
  export default function PageHeader({ title, subtitle }: PageHeaderProps) {
    return (
      <div className="border-b border-border pb-6 mb-8">
        <h1 className="text-3xl font-bold text-primary-foreground mb-2">
          {title}
        </h1>
        <p className="text-muted-foreground">
          {subtitle}
        </p>
      </div>
    );
  }