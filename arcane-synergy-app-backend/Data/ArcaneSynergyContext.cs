using arcane_synergy_app_backend.Models;
using arcane_synergy_app_backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace arcane_synergy_app_backend.Data
{
    public class ArcaneSynergyContext : DbContext
    {
        private readonly ICurrentUserAccessor? _currentUser;

        /// <summary>
        /// <paramref name="currentUser"/> is optional so tests and design-time
        /// tooling can build the context without the HTTP pipeline; edits made
        /// without it are attributed to "system".
        /// </summary>
        public ArcaneSynergyContext(
            DbContextOptions<ArcaneSynergyContext> options,
            ICurrentUserAccessor? currentUser = null)
            : base(options)
        {
            _currentUser = currentUser;
        }

        public DbSet<Patient> Patients { get; set; } = null!;
        public DbSet<Admission> Admissions { get; set; } = null!;
        public DbSet<Transfer> Transfers { get; set; } = null!;
        public DbSet<GapWorklistItem> GapWorklist { get; set; } = null!;
        public DbSet<GapWorkStatus> GapWorkStatuses { get; set; } = null!;
        public DbSet<EditHistory> EditHistory { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<GapWorklistItem>(e =>
            {
                e.HasNoKey();
                e.ToView("GapWorklist");
            });

            // Table is owned outside EF migrations; never create or alter it from here.
            modelBuilder.Entity<GapWorkStatus>(e =>
            {
                e.ToTable("GapWorkStatus", t => t.ExcludeFromMigrations());
                e.HasKey(s => new { s.Insurance, s.MemberId, s.MetricType });
            });

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

            modelBuilder.Entity<Admission>()
                .Property(a => a.LastEditedAt)
                .HasConversion(
                    v => v,
                    v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

            modelBuilder.Entity<Transfer>()
                .Property(t => t.LastEditedAt)
                .HasConversion(
                    v => v,
                    v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

            modelBuilder.Entity<EditHistory>(e =>
            {
                e.ToTable("EditHistory");

                e.HasIndex(h => new { h.EntityType, h.EntityId, h.ChangedAt });
                e.HasIndex(h => h.ChangedAt);

                e.Property(h => h.ChangedAt)
                    .HasConversion(
                        v => v,
                        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
            });
        }

        /// <summary>
        /// Saves the change and the <see cref="EditHistory"/> rows describing
        /// it. Inserted rows only have their database-generated keys after the
        /// first save, so history is written in a second pass; both passes run
        /// in one transaction so a change can never be stored without its
        /// history.
        /// </summary>
        public override int SaveChanges(bool acceptAllChangesOnSuccess)
        {
            var pending = EditHistoryRecorder.Capture(ChangeTracker, _currentUser?.UserName);

            if (pending.Count == 0)
                return base.SaveChanges(acceptAllChangesOnSuccess);

            using var transaction = BeginHistoryTransaction();

            var result = base.SaveChanges(acceptAllChangesOnSuccess);

            EditHistory.AddRange(pending.Select(p => p.Complete()));
            base.SaveChanges(acceptAllChangesOnSuccess);

            transaction?.Commit();
            return result;
        }

        /// <inheritdoc cref="SaveChanges(bool)" />
        public override async Task<int> SaveChangesAsync(
            bool acceptAllChangesOnSuccess,
            CancellationToken cancellationToken = default)
        {
            var pending = EditHistoryRecorder.Capture(ChangeTracker, _currentUser?.UserName);

            if (pending.Count == 0)
                return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);

            var transaction = await BeginHistoryTransactionAsync(cancellationToken);

            try
            {
                var result = await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);

                EditHistory.AddRange(pending.Select(p => p.Complete()));
                await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);

                if (transaction != null)
                    await transaction.CommitAsync(cancellationToken);

                return result;
            }
            finally
            {
                if (transaction != null)
                    await transaction.DisposeAsync();
            }
        }

        /// <summary>
        /// A transaction covering both saves, unless the caller already opened
        /// one or the provider has no transactions (the in-memory provider used
        /// by tests). Disposing without committing rolls the change back.
        /// </summary>
        private IDbContextTransaction? BeginHistoryTransaction() =>
            NeedsHistoryTransaction() ? Database.BeginTransaction() : null;

        private async Task<IDbContextTransaction?> BeginHistoryTransactionAsync(
            CancellationToken cancellationToken) =>
            NeedsHistoryTransaction()
                ? await Database.BeginTransactionAsync(cancellationToken)
                : null;

        private bool NeedsHistoryTransaction() =>
            Database.CurrentTransaction == null && Database.IsRelational();
    }
}
