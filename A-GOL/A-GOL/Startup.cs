using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(A_GOL.Startup))]
namespace A_GOL
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
        }
    }
}
