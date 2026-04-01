using System.Collections.Generic;
using System.Threading.Tasks;

namespace FaizanIslamicSchool.Application.Interfaces
{
    public interface IStudentService
    {
        Task<IEnumerable<StudentDto>> GetAllStudentsAsync();
        Task<StudentDto?> GetStudentByIdAsync(int id);
        Task<StudentDto> AddStudentAsync(CreateStudentDto studentDto);
        Task<bool> UpdateStudentAsync(int id, UpdateStudentDto studentDto);
        Task<bool> DeleteStudentAsync(int id);
        Task<IEnumerable<StudentDto>> GetDefaultersAsync();
    }

    public interface IFeeService
    {
        Task<IEnumerable<FeeVoucherDto>> GetVouchersByStudentIdAsync(int studentId);
        Task<bool> GenerateVouchersForMonthAsync(int month, int year, int? campusId = null);
        Task<FeeVoucherDto> GenerateSingleVoucherAsync(int studentId, int month, int year);
        Task<bool> ProcessQuickPayCallbackAsync(QuickPayCallbackDto callbackDto);
    }

    public interface IExamService
    {
        Task<IEnumerable<ExamTermDto>> GetExamTermsAsync(int campusId);
        Task<bool> AddMarksAsync(IEnumerable<StudentMarksDto> marksDto);
        Task<ResultCardDto> GetResultCardAsync(int studentId, int examTermId);
    }
}

namespace FaizanIslamicSchool.Application.DTOs
{
    public class StudentDto
    {
        public int Id { get; set; }
        public string RollNumber { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string CampusName { get; set; } = string.Empty;
        public decimal OutstandingFees { get; set; }
        public string Status { get; set; } = "Active";
    }

    public class CreateStudentDto
    {
        public int CampusId { get; set; }
        public int ClassId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string? LastName { get; set; }
        public string? FatherName { get; set; }
        public string? GuardianName { get; set; }
        public string? GuardianPhone { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Mobile { get; set; }
        public string? Address { get; set; }
        public decimal? OutstandingFees { get; set; }
    }

    public class UpdateStudentDto : CreateStudentDto { }

    public class FeeVoucherDto
    {
        public int Id { get; set; }
        public string RollNumber { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public string Status { get; set; } = "Unpaid";
        public DateTime DueDate { get; set; }
    }

    public class QuickPayCallbackDto
    {
        public string TransactionId { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Signature { get; set; } = string.Empty;
    }
}
