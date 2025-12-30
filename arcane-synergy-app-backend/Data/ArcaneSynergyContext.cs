

using arcane_synergy_app_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Data
{
    public class ArcaneSynergyContext : DbContext
    {
        public DbSet<Patient> Patients { get; set; } = null!;
        public DbSet<Admission> Admissions { get; set; } = null!;
        public DbSet<Transfer> Transfers {  get; set; } = null!;

        // Hard coding connection string for now
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.UseSqlServer(
                @"Server=(localdb)\MSSQLLocalDB;Database=ArcaneSynergyDB;Trusted_Connection=True;"
            );
        }
    }
}
