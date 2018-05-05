using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Newtonsoft.Json;
using A_GOL.Models;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;

namespace A_GOL.Controllers
{
    public class SimController : Controller
    {
        public ActionResult Index()
        {
            if (Request.IsAuthenticated)
            {
                var userId = User.Identity.GetUserId();
                var currentUser = (new ApplicationDbContext()).Users.FirstOrDefault(x => x.Id == userId);
                ViewBag.Sims = JsonConvert.DeserializeObject<List<Sim>>(currentUser.SavedSims);
                return View();
            }

            return RedirectToAction("Login", "Account");
        }

        public void SaveNew(int[] dataX, int[] dataY, int rule1, int rule2, int rule3, string name)
        {
            var ctx = System.Web.HttpContext.Current.GetOwinContext().Get<ApplicationDbContext>();
            string userId = User.Identity.GetUserId();
            var currentUser = (new ApplicationDbContext()).Users.FirstOrDefault(x => x.Id == userId);
            List<Sim> SavedSims = JsonConvert.DeserializeObject<List<Sim>>(currentUser.SavedSims);
            SavedSims.Add(new Sim(name, dataX, dataY, rule1, rule2, rule3));
            ctx.Users.FirstOrDefault(x => x.Id == userId).SavedSims = JsonConvert.SerializeObject(SavedSims, Formatting.Indented);
            ctx.SaveChanges();
            ViewBag.Sims = SavedSims;
        }
    }
}