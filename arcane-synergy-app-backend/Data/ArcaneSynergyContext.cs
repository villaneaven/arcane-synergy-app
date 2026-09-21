using arcane_synergy_app_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Data
{
    public class ArcaneSynergyContext : DbContext
    {
        public ArcaneSynergyContext(DbContextOptions<ArcaneSynergyContext> options)
            : base(options)
        {
        }

        public DbSet<Patient> Patients { get; set; } = null!;
        public DbSet<Admission> Admissions { get; set; } = null!;
        public DbSet<Transfer> Transfers { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Transfer>()
                .HasIndex(t => t.AdmissionId)
                .IsUnique()
                .HasFilter("[IsFinalDischarge] = 1");

            modelBuilder.Entity<Patient>()
                .HasIndex(p => new { p.LastName, p.FirstName });

            modelBuilder.Entity<Patient>()
                .HasIndex(p => p.FullName);

            modelBuilder.Entity<Patient>()
                .HasIndex(p => p.MRN);

            modelBuilder.Entity<Patient>()
                .HasIndex(p => new { p.MRN, p.Group })
                .IsUnique()
                .HasFilter("[MRN] IS NOT NULL");

            modelBuilder.Entity<Admission>()
                .HasIndex(a => a.AdmissionDate);

            modelBuilder.Entity<Admission>()
                .HasIndex(a => a.Type);
        }
    }
}
