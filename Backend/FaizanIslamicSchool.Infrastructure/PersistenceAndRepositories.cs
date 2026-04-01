using Microsoft.EntityFrameworkCore;
using FaizanIslamicSchool.Domain.Entities;
using FaizanIslamicSchool.Application.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

namespace FaizanIslamicSchool.Infrastructure.Persistence
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Campus> Campuses { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<Staff> Staff { get; set; }
        public DbSet<FeeStructure> FeeStructures { get; set; }
        public DbSet<FeeVoucher> FeeVouchers { get; set; }
        public DbSet<QuickPayConfig> QuickPayConfigs { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<ExamTerm> ExamTerms { get; set; }
        public DbSet<DateSheet> DateSheets { get; set; }
        public DbSet<GradePolicy> GradePolicies { get; set; }
        public DbSet<StudentResult> StudentResults { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // Configure relationships and constraints here
        }
    }

    public class StudentRepository : IStudentRepository
    {
        private readonly ApplicationDbContext _context;

        public StudentRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Student>> GetAllAsync()
        {
            return await _context.Students.Include(s => s.Campus).Include(s => s.Class).ToListAsync();
        }

        public async Task<Student?> GetByIdAsync(int id)
        {
            return await _context.Students.Include(s => s.Campus).Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<Student> AddAsync(Student student)
        {
            _context.Students.Add(student);
            await _context.SaveChangesAsync();
            return student;
        }

        public async Task<bool> UpdateAsync(Student student)
        {
            _context.Students.Update(student);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null) return false;
            _context.Students.Remove(student);
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
