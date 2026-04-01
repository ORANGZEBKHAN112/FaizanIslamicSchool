using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using FaizanIslamicSchool.Application.Interfaces;
using FaizanIslamicSchool.Application.DTOs;
using FaizanIslamicSchool.Domain.Entities;
using FaizanIslamicSchool.Infrastructure.Persistence;

namespace FaizanIslamicSchool.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;

        public AuthService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<AuthResponseDto?> LoginAsync(LoginRequestDto loginDto)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Username == loginDto.Username && u.PasswordHash == loginDto.Password); // Simple check for now

            if (user == null) return null;

            return new AuthResponseDto
            {
                Token = "mock-jwt-token-" + Guid.NewGuid().ToString(),
                User = new UserDto
                {
                    Id = user.Id,
                    FullName = user.FullName,
                    Username = user.Username,
                    Email = user.Email,
                    RoleName = user.Role?.Name ?? "User",
                    CampusId = user.CampusId
                }
            };
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto registerDto)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == registerDto.RoleName);
            if (role == null)
            {
                role = new Role { Name = registerDto.RoleName };
                _context.Roles.Add(role);
                await _context.SaveChangesAsync();
            }

            var user = new User
            {
                FullName = registerDto.FullName,
                Username = registerDto.Username,
                Email = registerDto.Email,
                PasswordHash = registerDto.Password, // Should be hashed in production
                RoleId = role.Id,
                CampusId = registerDto.CampusId,
                IsActive = true,
                CreatedOn = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return new AuthResponseDto
            {
                Token = "mock-jwt-token-" + Guid.NewGuid().ToString(),
                User = new UserDto
                {
                    Id = user.Id,
                    FullName = user.FullName,
                    Username = user.Username,
                    Email = user.Email,
                    RoleName = role.Name,
                    CampusId = user.CampusId
                }
            };
        }

        public async Task<UserDto?> GetCurrentUserAsync(string username)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null) return null;

            return new UserDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Username = user.Username,
                Email = user.Email,
                RoleName = user.Role?.Name ?? "User",
                CampusId = user.CampusId
            };
        }
    }
}
