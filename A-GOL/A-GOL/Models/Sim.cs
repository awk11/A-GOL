using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace A_GOL.Models
{
    public class Sim
    {

        public string Name { get; }
        public int[] DataX { get; }
        public int[] DataY { get; }
        public int RuleDieL { get; }
        public int RuleDieH { get; }
        public int RuleBirth { get; }
        public Sim(string name, int[] dataX, int[] dataY, int ruleDieL = 2, int ruleDieH = 3, int ruleBirth = 3)
        {
            Name = name;
            DataX = dataX;
            DataY = dataY;
            RuleDieL = ruleDieL;
            RuleDieH = ruleDieH;
            RuleBirth = ruleBirth;
        }
    }
}