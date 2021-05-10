(function() {
  print = typeof console == "object" && typeof console.log == "function" ? console.log : print;
  function Benchmark(name, run, setup, tearDown) {
    this.name = name;
    this.run = run;
    this.Setup = setup ? setup : function() {};
    this.TearDown = tearDown ? tearDown : function() {};
  }

  // Benchmark results hold the benchmark and the measured time used to
  // run the benchmark. The benchmark score is computed later once a
  // full benchmark suite has run to completion.
  function BenchmarkResult(benchmark, time) {
    this.benchmark = benchmark;
    this.time = time;
  }

  // Automatically convert results to numbers. Used by the geometric
  // mean computation.
  BenchmarkResult.prototype.valueOf = function() {
    return this.time;
  };

  // Suites of benchmarks consist of a name and the set of benchmarks in
  // addition to the reference timing that the final score will be based
  // on. This way, all scores are relative to a reference run and higher
  // scores implies better performance.
  function BenchmarkSuite(name, reference, benchmarks) {
    this.name = name;
    this.reference = reference;
    this.benchmarks = benchmarks;
    BenchmarkSuite.suites.push(this);
  }

  // Keep track of all declared benchmark suites.
  BenchmarkSuite.suites = [];

  // Scores are not comparable across versions. Bump the version if
  // you're making changes that will affect that scores, e.g. if you add
  // a new benchmark or change an existing one.
  BenchmarkSuite.version = "7";

  // To make the benchmark results predictable, we replace Math.random
  // with a 100% deterministic alternative.
  Math.random = (function() {
    var seed = 49734321;
    return function() {
      // Robert Jenkins' 32 bit integer hash function.
      seed = (seed + 0x7ed55d16 + (seed << 12)) & 0xffffffff;
      seed = (seed ^ 0xc761c23c ^ (seed >>> 19)) & 0xffffffff;
      seed = (seed + 0x165667b1 + (seed << 5)) & 0xffffffff;
      seed = ((seed + 0xd3a2646c) ^ (seed << 9)) & 0xffffffff;
      seed = (seed + 0xfd7046c5 + (seed << 3)) & 0xffffffff;
      seed = (seed ^ 0xb55a4f09 ^ (seed >>> 16)) & 0xffffffff;
      return (seed & 0xfffffff) / 0x10000000;
    };
  })();

  // Runs all registered benchmark suites and optionally yields between
  // each individual benchmark to avoid running for too long in the
  // context of browsers. Once done, the final score is reported to the
  // runner.
  BenchmarkSuite.RunSuites = function(runner) {
    var continuation = null;
    var suites = BenchmarkSuite.suites;
    var length = suites.length;
    BenchmarkSuite.scores = [];
    var index = 0;
    function RunStep() {
      while (continuation || index < length) {
        if (continuation) {
          continuation = continuation();
        } else {
          var suite = suites[index++];
          if (runner.NotifyStart) runner.NotifyStart(suite.name);
          continuation = suite.RunStep(runner);
        }
      }
      if (runner.NotifyScore) {
        var score = BenchmarkSuite.GeometricMean(BenchmarkSuite.scores);
        var formatted = BenchmarkSuite.FormatScore(100 * score);
        runner.NotifyScore(formatted);
      }
    }
    RunStep();
  };

  // Counts the total number of registered benchmarks. Useful for
  // showing progress as a percentage.
  BenchmarkSuite.CountBenchmarks = function() {
    var result = 0;
    var suites = BenchmarkSuite.suites;
    for (var i = 0; i < suites.length; i++) {
      result += suites[i].benchmarks.length;
    }
    return result;
  };

  // Computes the geometric mean of a set of numbers.
  BenchmarkSuite.GeometricMean = function(numbers) {
    var log = 0;
    for (var i = 0; i < numbers.length; i++) {
      log += Math.log(numbers[i]);
    }
    return Math.pow(Math.E, log / numbers.length);
  };

  // Converts a score value to a string with at least three significant
  // digits.
  BenchmarkSuite.FormatScore = function(value) {
    if (value > 100) {
      return value.toFixed(0);
    } else {
      return value.toPrecision(3);
    }
  };

  // Notifies the runner that we're done running a single benchmark in
  // the benchmark suite. This can be useful to report progress.
  BenchmarkSuite.prototype.NotifyStep = function(result) {
    this.results.push(result);
    if (this.runner.NotifyStep) this.runner.NotifyStep(result.benchmark.name);
  };

  // Notifies the runner that we're done with running a suite and that
  // we have a result which can be reported to the user if needed.
  BenchmarkSuite.prototype.NotifyResult = function() {
    var mean = BenchmarkSuite.GeometricMean(this.results);
    var score = this.reference / mean;
    BenchmarkSuite.scores.push(score);
    if (this.runner.NotifyResult) {
      var formatted = BenchmarkSuite.FormatScore(100 * score);
      this.runner.NotifyResult(this.name, formatted);
    }
  };

  // Notifies the runner that running a benchmark resulted in an error.
  BenchmarkSuite.prototype.NotifyError = function(error) {
    if (this.runner.NotifyError) {
      this.runner.NotifyError(this.name, error);
    }
    if (this.runner.NotifyStep) {
      this.runner.NotifyStep(this.name);
    }
  };

  // Runs a single benchmark for at least a second and computes the
  // average time it takes to run a single iteration.
  BenchmarkSuite.prototype.RunSingleBenchmark = function(benchmark, data) {
    function Measure(data) {
      var elapsed = 0;
      var start = new Date();
      for (var n = 0; elapsed < 1000; n++) {
        benchmark.run();
        elapsed = new Date() - start;
      }
      if (data != null) {
        data.runs += n;
        data.elapsed += elapsed;
      }
    }

    if (data == null) {
      // Measure the benchmark once for warm up and throw the result
      // away. Return a fresh data object.
      Measure(null);
      return { runs: 0, elapsed: 0 };
    } else {
      Measure(data);
      // If we've run too few iterations, we continue for another second.
      if (data.runs < 32) return data;
      var usec = (data.elapsed * 1000) / data.runs;
      this.NotifyStep(new BenchmarkResult(benchmark, usec));
      return null;
    }
  };

  // This function starts running a suite, but stops between each
  // individual benchmark in the suite and returns a continuation
  // function which can be invoked to run the next benchmark. Once the
  // last benchmark has been executed, null is returned.
  BenchmarkSuite.prototype.RunStep = function(runner) {
    this.results = [];
    this.runner = runner;
    var length = this.benchmarks.length;
    var index = 0;
    var suite = this;
    var data;

    // Run the setup, the actual benchmark, and the tear down in three
    // separate steps to allow the framework to yield between any of the
    // steps.

    function RunNextSetup() {
      if (index < length) {
        try {
          suite.benchmarks[index].Setup();
        } catch (e) {
          suite.NotifyError(e);
          return null;
        }
        return RunNextBenchmark;
      }
      suite.NotifyResult();
      return null;
    }

    function RunNextBenchmark() {
      try {
        data = suite.RunSingleBenchmark(suite.benchmarks[index], data);
      } catch (e) {
        suite.NotifyError(e);
        return null;
      }
      // If data is null, we're done with this benchmark.
      return data == null ? RunNextTearDown : RunNextBenchmark();
    }

    function RunNextTearDown() {
      try {
        suite.benchmarks[index++].TearDown();
      } catch (e) {
        suite.NotifyError(e);
        return null;
      }
      return RunNextSetup;
    }

    // Start out running the setup.
    return RunNextSetup();
  };

  var Richards = new BenchmarkSuite("Richards", 35302, [new Benchmark("Richards", runRichards)]);

  /**
   * The Richards benchmark simulates the task dispatcher of an
   * operating system.
   **/
  function runRichards() {
    var scheduler = new Scheduler();
    scheduler.addIdleTask(ID_IDLE, 0, null, COUNT);

    var queue = new Packet(null, ID_WORKER, KIND_WORK);
    queue = new Packet(queue, ID_WORKER, KIND_WORK);
    scheduler.addWorkerTask(ID_WORKER, 1000, queue);

    queue = new Packet(null, ID_DEVICE_A, KIND_DEVICE);
    queue = new Packet(queue, ID_DEVICE_A, KIND_DEVICE);
    queue = new Packet(queue, ID_DEVICE_A, KIND_DEVICE);
    scheduler.addHandlerTask(ID_HANDLER_A, 2000, queue);

    queue = new Packet(null, ID_DEVICE_B, KIND_DEVICE);
    queue = new Packet(queue, ID_DEVICE_B, KIND_DEVICE);
    queue = new Packet(queue, ID_DEVICE_B, KIND_DEVICE);
    scheduler.addHandlerTask(ID_HANDLER_B, 3000, queue);

    scheduler.addDeviceTask(ID_DEVICE_A, 4000, null);

    scheduler.addDeviceTask(ID_DEVICE_B, 5000, null);

    scheduler.schedule();

    if (scheduler.queueCount != EXPECTED_QUEUE_COUNT || scheduler.holdCount != EXPECTED_HOLD_COUNT) {
      var msg =
        "Error during execution: queueCount = " + scheduler.queueCount + ", holdCount = " + scheduler.holdCount + ".";
      throw new Error(msg);
    }
  }

  var COUNT = 1000;

  /**
   * These two constants specify how many times a packet is queued and
   * how many times a task is put on hold in a correct run of richards.
   * They don't have any meaning a such but are characteristic of a
   * correct run so if the actual queue or hold count is different from
   * the expected there must be a bug in the implementation.
   **/
  var EXPECTED_QUEUE_COUNT = 2322;
  var EXPECTED_HOLD_COUNT = 928;

  /**
   * A scheduler can be used to schedule a set of tasks based on their relative
   * priorities.  Scheduling is done by maintaining a list of task control blocks
   * which holds tasks and the data queue they are processing.
   * @constructor
   */
  function Scheduler() {
    this.queueCount = 0;
    this.holdCount = 0;
    this.blocks = new Array(NUMBER_OF_IDS);
    this.list = null;
    this.currentTcb = null;
    this.currentId = null;
  }

  var ID_IDLE = 0;
  var ID_WORKER = 1;
  var ID_HANDLER_A = 2;
  var ID_HANDLER_B = 3;
  var ID_DEVICE_A = 4;
  var ID_DEVICE_B = 5;
  var NUMBER_OF_IDS = 6;

  var KIND_DEVICE = 0;
  var KIND_WORK = 1;

  /**
   * Add an idle task to this scheduler.
   * @param {int} id the identity of the task
   * @param {int} priority the task's priority
   * @param {Packet} queue the queue of work to be processed by the task
   * @param {int} count the number of times to schedule the task
   */
  Scheduler.prototype.addIdleTask = function(id, priority, queue, count) {
    this.addRunningTask(id, priority, queue, new IdleTask(this, 1, count));
  };

  /**
   * Add a work task to this scheduler.
   * @param {int} id the identity of the task
   * @param {int} priority the task's priority
   * @param {Packet} queue the queue of work to be processed by the task
   */
  Scheduler.prototype.addWorkerTask = function(id, priority, queue) {
    this.addTask(id, priority, queue, new WorkerTask(this, ID_HANDLER_A, 0));
  };

  /**
   * Add a handler task to this scheduler.
   * @param {int} id the identity of the task
   * @param {int} priority the task's priority
   * @param {Packet} queue the queue of work to be processed by the task
   */
  Scheduler.prototype.addHandlerTask = function(id, priority, queue) {
    this.addTask(id, priority, queue, new HandlerTask(this));
  };

  /**
   * Add a handler task to this scheduler.
   * @param {int} id the identity of the task
   * @param {int} priority the task's priority
   * @param {Packet} queue the queue of work to be processed by the task
   */
  Scheduler.prototype.addDeviceTask = function(id, priority, queue) {
    this.addTask(id, priority, queue, new DeviceTask(this));
  };

  /**
   * Add the specified task and mark it as running.
   * @param {int} id the identity of the task
   * @param {int} priority the task's priority
   * @param {Packet} queue the queue of work to be processed by the task
   * @param {Task} task the task to add
   */
  Scheduler.prototype.addRunningTask = function(id, priority, queue, task) {
    this.addTask(id, priority, queue, task);
    this.currentTcb.setRunning();
  };

  /**
   * Add the specified task to this scheduler.
   * @param {int} id the identity of the task
   * @param {int} priority the task's priority
   * @param {Packet} queue the queue of work to be processed by the task
   * @param {Task} task the task to add
   */
  Scheduler.prototype.addTask = function(id, priority, queue, task) {
    this.currentTcb = new TaskControlBlock(this.list, id, priority, queue, task);
    this.list = this.currentTcb;
    this.blocks[id] = this.currentTcb;
  };

  /**
   * Execute the tasks managed by this scheduler.
   */
  Scheduler.prototype.schedule = function() {
    this.currentTcb = this.list;
    while (this.currentTcb != null) {
      if (this.currentTcb.isHeldOrSuspended()) {
        this.currentTcb = this.currentTcb.link;
      } else {
        this.currentId = this.currentTcb.id;
        this.currentTcb = this.currentTcb.run();
      }
    }
  };

  /**
   * Release a task that is currently blocked and return the next block to run.
   * @param {int} id the id of the task to suspend
   */
  Scheduler.prototype.release = function(id) {
    var tcb = this.blocks[id];
    if (tcb == null) return tcb;
    tcb.markAsNotHeld();
    if (tcb.priority > this.currentTcb.priority) {
      return tcb;
    } else {
      return this.currentTcb;
    }
  };

  /**
   * Block the currently executing task and return the next task control block
   * to run.  The blocked task will not be made runnable until it is explicitly
   * released, even if new work is added to it.
   */
  Scheduler.prototype.holdCurrent = function() {
    this.holdCount++;
    this.currentTcb.markAsHeld();
    return this.currentTcb.link;
  };

  /**
   * Suspend the currently executing task and return the next task control block
   * to run.  If new work is added to the suspended task it will be made runnable.
   */
  Scheduler.prototype.suspendCurrent = function() {
    this.currentTcb.markAsSuspended();
    return this.currentTcb;
  };

  /**
   * Add the specified packet to the end of the worklist used by the task
   * associated with the packet and make the task runnable if it is currently
   * suspended.
   * @param {Packet} packet the packet to add
   */
  Scheduler.prototype.queue = function(packet) {
    var t = this.blocks[packet.id];
    if (t == null) return t;
    this.queueCount++;
    packet.link = null;
    packet.id = this.currentId;
    return t.checkPriorityAdd(this.currentTcb, packet);
  };

  /**
   * A task control block manages a task and the queue of work packages associated
   * with it.
   * @param {TaskControlBlock} link the preceding block in the linked block list
   * @param {int} id the id of this block
   * @param {int} priority the priority of this block
   * @param {Packet} queue the queue of packages to be processed by the task
   * @param {Task} task the task
   * @constructor
   */
  function TaskControlBlock(link, id, priority, queue, task) {
    this.link = link;
    this.id = id;
    this.priority = priority;
    this.queue = queue;
    this.task = task;
    if (queue == null) {
      this.state = STATE_SUSPENDED;
    } else {
      this.state = STATE_SUSPENDED_RUNNABLE;
    }
  }

  /**
   * The task is running and is currently scheduled.
   */
  var STATE_RUNNING = 0;

  /**
   * The task has packets left to process.
   */
  var STATE_RUNNABLE = 1;

  /**
   * The task is not currently running.  The task is not blocked as such and may
   * be started by the scheduler.
   */
  var STATE_SUSPENDED = 2;

  /**
   * The task is blocked and cannot be run until it is explicitly released.
   */
  var STATE_HELD = 4;

  var STATE_SUSPENDED_RUNNABLE = STATE_SUSPENDED | STATE_RUNNABLE;
  var STATE_NOT_HELD = ~STATE_HELD;

  TaskControlBlock.prototype.setRunning = function() {
    this.state = STATE_RUNNING;
  };

  TaskControlBlock.prototype.markAsNotHeld = function() {
    this.state = this.state & STATE_NOT_HELD;
  };

  TaskControlBlock.prototype.markAsHeld = function() {
    this.state = this.state | STATE_HELD;
  };

  TaskControlBlock.prototype.isHeldOrSuspended = function() {
    return (this.state & STATE_HELD) != 0 || this.state == STATE_SUSPENDED;
  };

  TaskControlBlock.prototype.markAsSuspended = function() {
    this.state = this.state | STATE_SUSPENDED;
  };

  TaskControlBlock.prototype.markAsRunnable = function() {
    this.state = this.state | STATE_RUNNABLE;
  };

  /**
   * Runs this task, if it is ready to be run, and returns the next task to run.
   */
  TaskControlBlock.prototype.run = function() {
    var packet;
    if (this.state == STATE_SUSPENDED_RUNNABLE) {
      packet = this.queue;
      this.queue = packet.link;
      if (this.queue == null) {
        this.state = STATE_RUNNING;
      } else {
        this.state = STATE_RUNNABLE;
      }
    } else {
      packet = null;
    }
    return this.task.run(packet);
  };

  /**
   * Adds a packet to the worklist of this block's task, marks this as runnable if
   * necessary, and returns the next runnable object to run (the one
   * with the highest priority).
   */
  TaskControlBlock.prototype.checkPriorityAdd = function(task, packet) {
    if (this.queue == null) {
      this.queue = packet;
      this.markAsRunnable();
      if (this.priority > task.priority) return this;
    } else {
      this.queue = packet.addTo(this.queue);
    }
    return task;
  };

  TaskControlBlock.prototype.toString = function() {
    return "tcb { " + this.task + "@" + this.state + " }";
  };

  /**
   * An idle task doesn't do any work itself but cycles control between the two
   * device tasks.
   * @param {Scheduler} scheduler the scheduler that manages this task
   * @param {int} v1 a seed value that controls how the device tasks are scheduled
   * @param {int} count the number of times this task should be scheduled
   * @constructor
   */
  function IdleTask(scheduler, v1, count) {
    this.scheduler = scheduler;
    this.v1 = v1;
    this.count = count;
  }

  IdleTask.prototype.run = function(packet) {
    this.count--;
    if (this.count == 0) return this.scheduler.holdCurrent();
    if ((this.v1 & 1) == 0) {
      this.v1 = this.v1 >> 1;
      return this.scheduler.release(ID_DEVICE_A);
    } else {
      this.v1 = (this.v1 >> 1) ^ 0xd008;
      return this.scheduler.release(ID_DEVICE_B);
    }
  };

  IdleTask.prototype.toString = function() {
    return "IdleTask";
  };

  /**
   * A task that suspends itself after each time it has been run to simulate
   * waiting for data from an external device.
   * @param {Scheduler} scheduler the scheduler that manages this task
   * @constructor
   */
  function DeviceTask(scheduler) {
    this.scheduler = scheduler;
    this.v1 = null;
  }

  DeviceTask.prototype.run = function(packet) {
    if (packet == null) {
      if (this.v1 == null) return this.scheduler.suspendCurrent();
      var v = this.v1;
      this.v1 = null;
      return this.scheduler.queue(v);
    } else {
      this.v1 = packet;
      return this.scheduler.holdCurrent();
    }
  };

  DeviceTask.prototype.toString = function() {
    return "DeviceTask";
  };

  /**
   * A task that manipulates work packets.
   * @param {Scheduler} scheduler the scheduler that manages this task
   * @param {int} v1 a seed used to specify how work packets are manipulated
   * @param {int} v2 another seed used to specify how work packets are manipulated
   * @constructor
   */
  function WorkerTask(scheduler, v1, v2) {
    this.scheduler = scheduler;
    this.v1 = v1;
    this.v2 = v2;
  }

  WorkerTask.prototype.run = function(packet) {
    if (packet == null) {
      return this.scheduler.suspendCurrent();
    } else {
      if (this.v1 == ID_HANDLER_A) {
        this.v1 = ID_HANDLER_B;
      } else {
        this.v1 = ID_HANDLER_A;
      }
      packet.id = this.v1;
      packet.a1 = 0;
      for (var i = 0; i < DATA_SIZE; i++) {
        this.v2++;
        if (this.v2 > 26) this.v2 = 1;
        packet.a2[i] = this.v2;
      }
      return this.scheduler.queue(packet);
    }
  };

  WorkerTask.prototype.toString = function() {
    return "WorkerTask";
  };

  /**
   * A task that manipulates work packets and then suspends itself.
   * @param {Scheduler} scheduler the scheduler that manages this task
   * @constructor
   */
  function HandlerTask(scheduler) {
    this.scheduler = scheduler;
    this.v1 = null;
    this.v2 = null;
  }

  HandlerTask.prototype.run = function(packet) {
    if (packet != null) {
      if (packet.kind == KIND_WORK) {
        this.v1 = packet.addTo(this.v1);
      } else {
        this.v2 = packet.addTo(this.v2);
      }
    }
    if (this.v1 != null) {
      var count = this.v1.a1;
      var v;
      if (count < DATA_SIZE) {
        if (this.v2 != null) {
          v = this.v2;
          this.v2 = this.v2.link;
          v.a1 = this.v1.a2[count];
          this.v1.a1 = count + 1;
          return this.scheduler.queue(v);
        }
      } else {
        v = this.v1;
        this.v1 = this.v1.link;
        return this.scheduler.queue(v);
      }
    }
    return this.scheduler.suspendCurrent();
  };

  HandlerTask.prototype.toString = function() {
    return "HandlerTask";
  };

  /* --- *
   * P a c k e t
   * --- */

  var DATA_SIZE = 4;

  /**
   * A simple package of data that is manipulated by the tasks.  The exact layout
   * of the payload data carried by a packet is not importaint, and neither is the
   * nature of the work performed on packets by the tasks.
   *
   * Besides carrying data, packets form linked lists and are hence used both as
   * data and worklists.
   * @param {Packet} link the tail of the linked list of packets
   * @param {int} id an ID for this packet
   * @param {int} kind the type of this packet
   * @constructor
   */
  function Packet(link, id, kind) {
    this.link = link;
    this.id = id;
    this.kind = kind;
    this.a1 = 0;
    this.a2 = new Array(DATA_SIZE);
  }

  /**
   * Add this packet to the end of a worklist, and return the worklist.
   * @param {Packet} queue the worklist to add this packet to
   */
  Packet.prototype.addTo = function(queue) {
    this.link = null;
    if (queue == null) return this;
    var peek,
      next = queue;
    while ((peek = next.link) != null) next = peek;
    next.link = this;
    return queue;
  };

  Packet.prototype.toString = function() {
    return "Packet";
  };

  // The code has been adapted for use as a benchmark by Google.
  var Crypto = new BenchmarkSuite("Crypto", 266181, [
    new Benchmark("Encrypt", encrypt),
    new Benchmark("Decrypt", decrypt),
  ]);

  // Basic JavaScript BN library - subset useful for RSA encryption.

  // Bits per digit
  var dbits;
  var BI_DB;
  var BI_DM;
  var BI_DV;

  var BI_FP;
  var BI_FV;
  var BI_F1;
  var BI_F2;

  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = (canary & 0xffffff) == 0xefcafe;

  // (public) Constructor
  function BigInteger(a, b, c) {
    this.array = new Array();
    if (a != null)
      if ("number" == typeof a) this.fromNumber(a, b, c);
      else if (b == null && "string" != typeof a) this.fromString(a, 256);
      else this.fromString(a, b);
  }

  // return new, unset BigInteger
  function nbi() {
    return new BigInteger(null);
  }

  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.

  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i, x, w, j, c, n) {
    var this_array = this.array;
    var w_array = w.array;
    while (--n >= 0) {
      var v = x * this_array[i++] + w_array[j] + c;
      c = Math.floor(v / 0x4000000);
      w_array[j++] = v & 0x3ffffff;
    }
    return c;
  }

  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i, x, w, j, c, n) {
    var this_array = this.array;
    var w_array = w.array;
    var xl = x & 0x7fff,
      xh = x >> 15;
    while (--n >= 0) {
      var l = this_array[i] & 0x7fff;
      var h = this_array[i++] >> 15;
      var m = xh * l + h * xl;
      l = xl * l + ((m & 0x7fff) << 15) + w_array[j] + (c & 0x3fffffff);
      c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
      w_array[j++] = l & 0x3fffffff;
    }
    return c;
  }

  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i, x, w, j, c, n) {
    var this_array = this.array;
    var w_array = w.array;

    var xl = x & 0x3fff,
      xh = x >> 14;
    while (--n >= 0) {
      var l = this_array[i] & 0x3fff;
      var h = this_array[i++] >> 14;
      var m = xh * l + h * xl;
      l = xl * l + ((m & 0x3fff) << 14) + w_array[j] + c;
      c = (l >> 28) + (m >> 14) + xh * h;
      w_array[j++] = l & 0xfffffff;
    }
    return c;
  }

  // This is tailored to VMs with 2-bit tagging. It makes sure
  // that all the computations stay within the 29 bits available.
  function am4(i, x, w, j, c, n) {
    var this_array = this.array;
    var w_array = w.array;

    var xl = x & 0x1fff,
      xh = x >> 13;
    while (--n >= 0) {
      var l = this_array[i] & 0x1fff;
      var h = this_array[i++] >> 13;
      var m = xh * l + h * xl;
      l = xl * l + ((m & 0x1fff) << 13) + w_array[j] + c;
      c = (l >> 26) + (m >> 13) + xh * h;
      w_array[j++] = l & 0x3ffffff;
    }
    return c;
  }

  // am3/28 is best for SM, Rhino, but am4/26 is best for v8.
  // Kestrel (Opera 9.5) gets its best result with am4/26.
  // IE7 does 9% better with am3/28 than with am4/26.
  // Firefox (SM) gets 10% faster with am3/28 than with am4/26.

  setupEngine = function(fn, bits) {
    BigInteger.prototype.am = fn;
    dbits = bits;

    BI_DB = dbits;
    BI_DM = (1 << dbits) - 1;
    BI_DV = 1 << dbits;

    BI_FP = 52;
    BI_FV = Math.pow(2, BI_FP);
    BI_F1 = BI_FP - dbits;
    BI_F2 = 2 * dbits - BI_FP;
  };

  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr, vv;
  rr = "0".charCodeAt(0);
  for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  function int2char(n) {
    return BI_RM.charAt(n);
  }
  function intAt(s, i) {
    var c = BI_RC[s.charCodeAt(i)];
    return c == null ? -1 : c;
  }

  // (protected) copy this to r
  function bnpCopyTo(r) {
    var this_array = this.array;
    var r_array = r.array;

    for (var i = this.t - 1; i >= 0; --i) r_array[i] = this_array[i];
    r.t = this.t;
    r.s = this.s;
  }

  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    var this_array = this.array;
    this.t = 1;
    this.s = x < 0 ? -1 : 0;
    if (x > 0) this_array[0] = x;
    else if (x < -1) this_array[0] = x + DV;
    else this.t = 0;
  }

  // return bigint initialized to value
  function nbv(i) {
    var r = nbi();
    r.fromInt(i);
    return r;
  }

  // (protected) set from string and radix
  function bnpFromString(s, b) {
    var this_array = this.array;
    var k;
    if (b == 16) k = 4;
    else if (b == 8) k = 3;
    else if (b == 256) k = 8;
    // byte array
    else if (b == 2) k = 1;
    else if (b == 32) k = 5;
    else if (b == 4) k = 2;
    else {
      this.fromRadix(s, b);
      return;
    }
    this.t = 0;
    this.s = 0;
    var i = s.length,
      mi = false,
      sh = 0;
    while (--i >= 0) {
      var x = k == 8 ? s[i] & 0xff : intAt(s, i);
      if (x < 0) {
        if (s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if (sh == 0) this_array[this.t++] = x;
      else if (sh + k > BI_DB) {
        this_array[this.t - 1] |= (x & ((1 << (BI_DB - sh)) - 1)) << sh;
        this_array[this.t++] = x >> (BI_DB - sh);
      } else this_array[this.t - 1] |= x << sh;
      sh += k;
      if (sh >= BI_DB) sh -= BI_DB;
    }
    if (k == 8 && (s[0] & 0x80) != 0) {
      this.s = -1;
      if (sh > 0) this_array[this.t - 1] |= ((1 << (BI_DB - sh)) - 1) << sh;
    }
    this.clamp();
    if (mi) BigInteger.ZERO.subTo(this, this);
  }

  // (protected) clamp off excess high words
  function bnpClamp() {
    var this_array = this.array;
    var c = this.s & BI_DM;
    while (this.t > 0 && this_array[this.t - 1] == c) --this.t;
  }

  // (public) return string representation in given radix
  function bnToString(b) {
    var this_array = this.array;
    if (this.s < 0) return "-" + this.negate().toString(b);
    var k;
    if (b == 16) k = 4;
    else if (b == 8) k = 3;
    else if (b == 2) k = 1;
    else if (b == 32) k = 5;
    else if (b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1 << k) - 1,
      d,
      m = false,
      r = "",
      i = this.t;
    var p = BI_DB - ((i * BI_DB) % k);
    if (i-- > 0) {
      if (p < BI_DB && (d = this_array[i] >> p) > 0) {
        m = true;
        r = int2char(d);
      }
      while (i >= 0) {
        if (p < k) {
          d = (this_array[i] & ((1 << p) - 1)) << (k - p);
          d |= this_array[--i] >> (p += BI_DB - k);
        } else {
          d = (this_array[i] >> (p -= k)) & km;
          if (p <= 0) {
            p += BI_DB;
            --i;
          }
        }
        if (d > 0) m = true;
        if (m) r += int2char(d);
      }
    }
    return m ? r : "0";
  }

  // (public) -this
  function bnNegate() {
    var r = nbi();
    BigInteger.ZERO.subTo(this, r);
    return r;
  }

  // (public) |this|
  function bnAbs() {
    return this.s < 0 ? this.negate() : this;
  }

  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var this_array = this.array;
    var a_array = a.array;

    var r = this.s - a.s;
    if (r != 0) return r;
    var i = this.t;
    r = i - a.t;
    if (r != 0) return r;
    while (--i >= 0) if ((r = this_array[i] - a_array[i]) != 0) return r;
    return 0;
  }

  // returns bit length of the integer x
  function nbits(x) {
    var r = 1,
      t;
    if ((t = x >>> 16) != 0) {
      x = t;
      r += 16;
    }
    if ((t = x >> 8) != 0) {
      x = t;
      r += 8;
    }
    if ((t = x >> 4) != 0) {
      x = t;
      r += 4;
    }
    if ((t = x >> 2) != 0) {
      x = t;
      r += 2;
    }
    if ((t = x >> 1) != 0) {
      x = t;
      r += 1;
    }
    return r;
  }

  // (public) return the number of bits in "this"
  function bnBitLength() {
    var this_array = this.array;
    if (this.t <= 0) return 0;
    return BI_DB * (this.t - 1) + nbits(this_array[this.t - 1] ^ (this.s & BI_DM));
  }

  // (protected) r = this << n*DB
  function bnpDLShiftTo(n, r) {
    var this_array = this.array;
    var r_array = r.array;
    var i;
    for (i = this.t - 1; i >= 0; --i) r_array[i + n] = this_array[i];
    for (i = n - 1; i >= 0; --i) r_array[i] = 0;
    r.t = this.t + n;
    r.s = this.s;
  }

  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n, r) {
    var this_array = this.array;
    var r_array = r.array;
    for (var i = n; i < this.t; ++i) r_array[i - n] = this_array[i];
    r.t = Math.max(this.t - n, 0);
    r.s = this.s;
  }

  // (protected) r = this << n
  function bnpLShiftTo(n, r) {
    var this_array = this.array;
    var r_array = r.array;
    var bs = n % BI_DB;
    var cbs = BI_DB - bs;
    var bm = (1 << cbs) - 1;
    var ds = Math.floor(n / BI_DB),
      c = (this.s << bs) & BI_DM,
      i;
    for (i = this.t - 1; i >= 0; --i) {
      r_array[i + ds + 1] = (this_array[i] >> cbs) | c;
      c = (this_array[i] & bm) << bs;
    }
    for (i = ds - 1; i >= 0; --i) r_array[i] = 0;
    r_array[ds] = c;
    r.t = this.t + ds + 1;
    r.s = this.s;
    r.clamp();
  }

  // (protected) r = this >> n
  function bnpRShiftTo(n, r) {
    var this_array = this.array;
    var r_array = r.array;
    r.s = this.s;
    var ds = Math.floor(n / BI_DB);
    if (ds >= this.t) {
      r.t = 0;
      return;
    }
    var bs = n % BI_DB;
    var cbs = BI_DB - bs;
    var bm = (1 << bs) - 1;
    r_array[0] = this_array[ds] >> bs;
    for (var i = ds + 1; i < this.t; ++i) {
      r_array[i - ds - 1] |= (this_array[i] & bm) << cbs;
      r_array[i - ds] = this_array[i] >> bs;
    }
    if (bs > 0) r_array[this.t - ds - 1] |= (this.s & bm) << cbs;
    r.t = this.t - ds;
    r.clamp();
  }

  // (protected) r = this - a
  function bnpSubTo(a, r) {
    var this_array = this.array;
    var r_array = r.array;
    var a_array = a.array;
    var i = 0,
      c = 0,
      m = Math.min(a.t, this.t);
    while (i < m) {
      c += this_array[i] - a_array[i];
      r_array[i++] = c & BI_DM;
      c >>= BI_DB;
    }
    if (a.t < this.t) {
      c -= a.s;
      while (i < this.t) {
        c += this_array[i];
        r_array[i++] = c & BI_DM;
        c >>= BI_DB;
      }
      c += this.s;
    } else {
      c += this.s;
      while (i < a.t) {
        c -= a_array[i];
        r_array[i++] = c & BI_DM;
        c >>= BI_DB;
      }
      c -= a.s;
    }
    r.s = c < 0 ? -1 : 0;
    if (c < -1) r_array[i++] = BI_DV + c;
    else if (c > 0) r_array[i++] = c;
    r.t = i;
    r.clamp();
  }

  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a, r) {
    var this_array = this.array;
    var r_array = r.array;
    var x = this.abs(),
      y = a.abs();
    var y_array = y.array;

    var i = x.t;
    r.t = i + y.t;
    while (--i >= 0) r_array[i] = 0;
    for (i = 0; i < y.t; ++i) r_array[i + x.t] = x.am(0, y_array[i], r, i, 0, x.t);
    r.s = 0;
    r.clamp();
    if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
  }

  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var x_array = x.array;
    var r_array = r.array;

    var i = (r.t = 2 * x.t);
    while (--i >= 0) r_array[i] = 0;
    for (i = 0; i < x.t - 1; ++i) {
      var c = x.am(i, x_array[i], r, 2 * i, 0, 1);
      if ((r_array[i + x.t] += x.am(i + 1, 2 * x_array[i], r, 2 * i + 1, c, x.t - i - 1)) >= BI_DV) {
        r_array[i + x.t] -= BI_DV;
        r_array[i + x.t + 1] = 1;
      }
    }
    if (r.t > 0) r_array[r.t - 1] += x.am(i, x_array[i], r, 2 * i, 0, 1);
    r.s = 0;
    r.clamp();
  }

  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m, q, r) {
    var pm = m.abs();
    if (pm.t <= 0) return;
    var pt = this.abs();
    if (pt.t < pm.t) {
      if (q != null) q.fromInt(0);
      if (r != null) this.copyTo(r);
      return;
    }
    if (r == null) r = nbi();
    var y = nbi(),
      ts = this.s,
      ms = m.s;
    var pm_array = pm.array;
    var nsh = BI_DB - nbits(pm_array[pm.t - 1]); // normalize modulus
    if (nsh > 0) {
      pm.lShiftTo(nsh, y);
      pt.lShiftTo(nsh, r);
    } else {
      pm.copyTo(y);
      pt.copyTo(r);
    }
    var ys = y.t;

    var y_array = y.array;
    var y0 = y_array[ys - 1];
    if (y0 == 0) return;
    var yt = y0 * (1 << BI_F1) + (ys > 1 ? y_array[ys - 2] >> BI_F2 : 0);
    var d1 = BI_FV / yt,
      d2 = (1 << BI_F1) / yt,
      e = 1 << BI_F2;
    var i = r.t,
      j = i - ys,
      t = q == null ? nbi() : q;
    y.dlShiftTo(j, t);

    var r_array = r.array;
    if (r.compareTo(t) >= 0) {
      r_array[r.t++] = 1;
      r.subTo(t, r);
    }
    BigInteger.ONE.dlShiftTo(ys, t);
    t.subTo(y, y); // "negative" y so we can replace sub with am later
    while (y.t < ys) y_array[y.t++] = 0;
    while (--j >= 0) {
      // Estimate quotient digit
      var qd = r_array[--i] == y0 ? BI_DM : Math.floor(r_array[i] * d1 + (r_array[i - 1] + e) * d2);
      if ((r_array[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
        // Try it out
        y.dlShiftTo(j, t);
        r.subTo(t, r);
        while (r_array[i] < --qd) r.subTo(t, r);
      }
    }
    if (q != null) {
      r.drShiftTo(ys, q);
      if (ts != ms) BigInteger.ZERO.subTo(q, q);
    }
    r.t = ys;
    r.clamp();
    if (nsh > 0) r.rShiftTo(nsh, r); // Denormalize remainder
    if (ts < 0) BigInteger.ZERO.subTo(r, r);
  }

  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a, null, r);
    if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
    return r;
  }

  // Modular reduction using "classic" algorithm
  function Classic(m) {
    this.m = m;
  }
  function cConvert(x) {
    if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) {
    return x;
  }
  function cReduce(x) {
    x.divRemTo(this.m, null, x);
  }
  function cMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r);
  }
  function cSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  }

  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;

  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    var this_array = this.array;
    if (this.t < 1) return 0;
    var x = this_array[0];
    if ((x & 1) == 0) return 0;
    var y = x & 3; // y == 1/x mod 2^2
    y = (y * (2 - (x & 0xf) * y)) & 0xf; // y == 1/x mod 2^4
    y = (y * (2 - (x & 0xff) * y)) & 0xff; // y == 1/x mod 2^8
    y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff; // y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y * (2 - ((x * y) % BI_DV))) % BI_DV; // y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return y > 0 ? BI_DV - y : -y;
  }

  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp & 0x7fff;
    this.mph = this.mp >> 15;
    this.um = (1 << (BI_DB - 15)) - 1;
    this.mt2 = 2 * m.t;
  }

  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t, r);
    r.divRemTo(this.m, null, r);
    if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
    return r;
  }

  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }

  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    var x_array = x.array;
    while (x.t <= this.mt2)
      // pad x so am has enough room later
      x_array[x.t++] = 0;
    for (var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x_array[i] & 0x7fff;
      var u0 = (j * this.mpl + (((j * this.mph + (x_array[i] >> 15) * this.mpl) & this.um) << 15)) & BI_DM;
      // use am to combine the multiply-shift-add into one call
      j = i + this.m.t;
      x_array[j] += this.m.am(0, u0, x, i, 0, this.m.t);
      // propagate carry
      while (x_array[j] >= BI_DV) {
        x_array[j] -= BI_DV;
        x_array[++j]++;
      }
    }
    x.clamp();
    x.drShiftTo(this.m.t, x);
    if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
  }

  // r = "x^2/R mod m"; x != r
  function montSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  }

  // r = "xy/R mod m"; x,y != r
  function montMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r);
  }

  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;

  // (protected) true iff this is even
  function bnpIsEven() {
    var this_array = this.array;
    return (this.t > 0 ? this_array[0] & 1 : this.s) == 0;
  }

  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e, z) {
    if (e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(),
      r2 = nbi(),
      g = z.convert(this),
      i = nbits(e) - 1;
    g.copyTo(r);
    while (--i >= 0) {
      z.sqrTo(r, r2);
      if ((e & (1 << i)) > 0) z.mulTo(r2, g, r);
      else {
        var t = r;
        r = r2;
        r2 = t;
      }
    }
    return z.revert(r);
  }

  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e, m) {
    var z;
    if (e < 256 || m.isEven()) z = new Classic(m);
    else z = new Montgomery(m);
    return this.exp(e, z);
  }

  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;

  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;

  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);
  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // See "LICENSE" for details.

  // Extended JavaScript BN functions, required for RSA private ops.

  // (public)
  function bnClone() {
    var r = nbi();
    this.copyTo(r);
    return r;
  }

  // (public) return value as integer
  function bnIntValue() {
    var this_array = this.array;
    if (this.s < 0) {
      if (this.t == 1) return this_array[0] - BI_DV;
      else if (this.t == 0) return -1;
    } else if (this.t == 1) return this_array[0];
    else if (this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this_array[1] & ((1 << (32 - BI_DB)) - 1)) << BI_DB) | this_array[0];
  }

  // (public) return value as byte
  function bnByteValue() {
    var this_array = this.array;
    return this.t == 0 ? this.s : (this_array[0] << 24) >> 24;
  }

  // (public) return value as short (assumes DB>=16)
  function bnShortValue() {
    var this_array = this.array;
    return this.t == 0 ? this.s : (this_array[0] << 16) >> 16;
  }

  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) {
    return Math.floor((Math.LN2 * BI_DB) / Math.log(r));
  }

  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    var this_array = this.array;
    if (this.s < 0) return -1;
    else if (this.t <= 0 || (this.t == 1 && this_array[0] <= 0)) return 0;
    else return 1;
  }

  // (protected) convert to radix string
  function bnpToRadix(b) {
    if (b == null) b = 10;
    if (this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b, cs);
    var d = nbv(a),
      y = nbi(),
      z = nbi(),
      r = "";
    this.divRemTo(d, y, z);
    while (y.signum() > 0) {
      r = (a + z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d, y, z);
    }
    return z.intValue().toString(b) + r;
  }

  // (protected) convert from radix string
  function bnpFromRadix(s, b) {
    this.fromInt(0);
    if (b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b, cs),
      mi = false,
      j = 0,
      w = 0;
    for (var i = 0; i < s.length; ++i) {
      var x = intAt(s, i);
      if (x < 0) {
        if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b * w + x;
      if (++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w, 0);
        j = 0;
        w = 0;
      }
    }
    if (j > 0) {
      this.dMultiply(Math.pow(b, j));
      this.dAddOffset(w, 0);
    }
    if (mi) BigInteger.ZERO.subTo(this, this);
  }

  // (protected) alternate constructor
  function bnpFromNumber(a, b, c) {
    if ("number" == typeof b) {
      // new BigInteger(int,int,RNG)
      if (a < 2) this.fromInt(1);
      else {
        this.fromNumber(a, c);
        if (!this.testBit(a - 1))
          // force MSB set
          this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
        if (this.isEven()) this.dAddOffset(1, 0); // force odd
        while (!this.isProbablePrime(b)) {
          this.dAddOffset(2, 0);
          if (this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
        }
      }
    } else {
      // new BigInteger(int,RNG)
      var x = new Array(),
        t = a & 7;
      x.length = (a >> 3) + 1;
      b.nextBytes(x);
      if (t > 0) x[0] &= (1 << t) - 1;
      else x[0] = 0;
      this.fromString(x, 256);
    }
  }

  // (public) convert to bigendian byte array
  function bnToByteArray() {
    var this_array = this.array;
    var i = this.t,
      r = new Array();
    r[0] = this.s;
    var p = BI_DB - ((i * BI_DB) % 8),
      d,
      k = 0;
    if (i-- > 0) {
      if (p < BI_DB && (d = this_array[i] >> p) != (this.s & BI_DM) >> p) r[k++] = d | (this.s << (BI_DB - p));
      while (i >= 0) {
        if (p < 8) {
          d = (this_array[i] & ((1 << p) - 1)) << (8 - p);
          d |= this_array[--i] >> (p += BI_DB - 8);
        } else {
          d = (this_array[i] >> (p -= 8)) & 0xff;
          if (p <= 0) {
            p += BI_DB;
            --i;
          }
        }
        if ((d & 0x80) != 0) d |= -256;
        if (k == 0 && (this.s & 0x80) != (d & 0x80)) ++k;
        if (k > 0 || d != this.s) r[k++] = d;
      }
    }
    return r;
  }

  function bnEquals(a) {
    return this.compareTo(a) == 0;
  }
  function bnMin(a) {
    return this.compareTo(a) < 0 ? this : a;
  }
  function bnMax(a) {
    return this.compareTo(a) > 0 ? this : a;
  }

  // (protected) r = this op a (bitwise)
  function bnpBitwiseTo(a, op, r) {
    var this_array = this.array;
    var a_array = a.array;
    var r_array = r.array;
    var i,
      f,
      m = Math.min(a.t, this.t);
    for (i = 0; i < m; ++i) r_array[i] = op(this_array[i], a_array[i]);
    if (a.t < this.t) {
      f = a.s & BI_DM;
      for (i = m; i < this.t; ++i) r_array[i] = op(this_array[i], f);
      r.t = this.t;
    } else {
      f = this.s & BI_DM;
      for (i = m; i < a.t; ++i) r_array[i] = op(f, a_array[i]);
      r.t = a.t;
    }
    r.s = op(this.s, a.s);
    r.clamp();
  }

  // (public) this & a
  function op_and(x, y) {
    return x & y;
  }
  function bnAnd(a) {
    var r = nbi();
    this.bitwiseTo(a, op_and, r);
    return r;
  }

  // (public) this | a
  function op_or(x, y) {
    return x | y;
  }
  function bnOr(a) {
    var r = nbi();
    this.bitwiseTo(a, op_or, r);
    return r;
  }

  // (public) this ^ a
  function op_xor(x, y) {
    return x ^ y;
  }
  function bnXor(a) {
    var r = nbi();
    this.bitwiseTo(a, op_xor, r);
    return r;
  }

  // (public) this & ~a
  function op_andnot(x, y) {
    return x & ~y;
  }
  function bnAndNot(a) {
    var r = nbi();
    this.bitwiseTo(a, op_andnot, r);
    return r;
  }

  // (public) ~this
  function bnNot() {
    var this_array = this.array;
    var r = nbi();
    var r_array = r.array;

    for (var i = 0; i < this.t; ++i) r_array[i] = BI_DM & ~this_array[i];
    r.t = this.t;
    r.s = ~this.s;
    return r;
  }

  // (public) this << n
  function bnShiftLeft(n) {
    var r = nbi();
    if (n < 0) this.rShiftTo(-n, r);
    else this.lShiftTo(n, r);
    return r;
  }

  // (public) this >> n
  function bnShiftRight(n) {
    var r = nbi();
    if (n < 0) this.lShiftTo(-n, r);
    else this.rShiftTo(n, r);
    return r;
  }

  // return index of lowest 1-bit in x, x < 2^31
  function lbit(x) {
    if (x == 0) return -1;
    var r = 0;
    if ((x & 0xffff) == 0) {
      x >>= 16;
      r += 16;
    }
    if ((x & 0xff) == 0) {
      x >>= 8;
      r += 8;
    }
    if ((x & 0xf) == 0) {
      x >>= 4;
      r += 4;
    }
    if ((x & 3) == 0) {
      x >>= 2;
      r += 2;
    }
    if ((x & 1) == 0) ++r;
    return r;
  }

  // (public) returns index of lowest 1-bit (or -1 if none)
  function bnGetLowestSetBit() {
    var this_array = this.array;
    for (var i = 0; i < this.t; ++i) if (this_array[i] != 0) return i * BI_DB + lbit(this_array[i]);
    if (this.s < 0) return this.t * BI_DB;
    return -1;
  }

  // return number of 1 bits in x
  function cbit(x) {
    var r = 0;
    while (x != 0) {
      x &= x - 1;
      ++r;
    }
    return r;
  }

  // (public) return number of set bits
  function bnBitCount() {
    var r = 0,
      x = this.s & BI_DM;
    for (var i = 0; i < this.t; ++i) r += cbit(this_array[i] ^ x);
    return r;
  }

  // (public) true iff nth bit is set
  function bnTestBit(n) {
    var this_array = this.array;
    var j = Math.floor(n / BI_DB);
    if (j >= this.t) return this.s != 0;
    return (this_array[j] & (1 << n % BI_DB)) != 0;
  }

  // (protected) this op (1<<n)
  function bnpChangeBit(n, op) {
    var r = BigInteger.ONE.shiftLeft(n);
    this.bitwiseTo(r, op, r);
    return r;
  }

  // (public) this | (1<<n)
  function bnSetBit(n) {
    return this.changeBit(n, op_or);
  }

  // (public) this & ~(1<<n)
  function bnClearBit(n) {
    return this.changeBit(n, op_andnot);
  }

  // (public) this ^ (1<<n)
  function bnFlipBit(n) {
    return this.changeBit(n, op_xor);
  }

  // (protected) r = this + a
  function bnpAddTo(a, r) {
    var this_array = this.array;
    var a_array = a.array;
    var r_array = r.array;
    var i = 0,
      c = 0,
      m = Math.min(a.t, this.t);
    while (i < m) {
      c += this_array[i] + a_array[i];
      r_array[i++] = c & BI_DM;
      c >>= BI_DB;
    }
    if (a.t < this.t) {
      c += a.s;
      while (i < this.t) {
        c += this_array[i];
        r_array[i++] = c & BI_DM;
        c >>= BI_DB;
      }
      c += this.s;
    } else {
      c += this.s;
      while (i < a.t) {
        c += a_array[i];
        r_array[i++] = c & BI_DM;
        c >>= BI_DB;
      }
      c += a.s;
    }
    r.s = c < 0 ? -1 : 0;
    if (c > 0) r_array[i++] = c;
    else if (c < -1) r_array[i++] = BI_DV + c;
    r.t = i;
    r.clamp();
  }

  // (public) this + a
  function bnAdd(a) {
    var r = nbi();
    this.addTo(a, r);
    return r;
  }

  // (public) this - a
  function bnSubtract(a) {
    var r = nbi();
    this.subTo(a, r);
    return r;
  }

  // (public) this * a
  function bnMultiply(a) {
    var r = nbi();
    this.multiplyTo(a, r);
    return r;
  }

  // (public) this / a
  function bnDivide(a) {
    var r = nbi();
    this.divRemTo(a, r, null);
    return r;
  }

  // (public) this % a
  function bnRemainder(a) {
    var r = nbi();
    this.divRemTo(a, null, r);
    return r;
  }

  // (public) [this/a,this%a]
  function bnDivideAndRemainder(a) {
    var q = nbi(),
      r = nbi();
    this.divRemTo(a, q, r);
    return new Array(q, r);
  }

  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    var this_array = this.array;
    this_array[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
    ++this.t;
    this.clamp();
  }

  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n, w) {
    var this_array = this.array;
    while (this.t <= w) this_array[this.t++] = 0;
    this_array[w] += n;
    while (this_array[w] >= BI_DV) {
      this_array[w] -= BI_DV;
      if (++w >= this.t) this_array[this.t++] = 0;
      ++this_array[w];
    }
  }

  // A "null" reducer
  function NullExp() {}
  function nNop(x) {
    return x;
  }
  function nMulTo(x, y, r) {
    x.multiplyTo(y, r);
  }
  function nSqrTo(x, r) {
    x.squareTo(r);
  }

  NullExp.prototype.convert = nNop;
  NullExp.prototype.revert = nNop;
  NullExp.prototype.mulTo = nMulTo;
  NullExp.prototype.sqrTo = nSqrTo;

  // (public) this^e
  function bnPow(e) {
    return this.exp(e, new NullExp());
  }

  // (protected) r = lower n words of "this * a", a.t <= n
  // "this" should be the larger one if appropriate.
  function bnpMultiplyLowerTo(a, n, r) {
    var r_array = r.array;
    var a_array = a.array;
    var i = Math.min(this.t + a.t, n);
    r.s = 0; // assumes a,this >= 0
    r.t = i;
    while (i > 0) r_array[--i] = 0;
    var j;
    for (j = r.t - this.t; i < j; ++i) r_array[i + this.t] = this.am(0, a_array[i], r, i, 0, this.t);
    for (j = Math.min(a.t, n); i < j; ++i) this.am(0, a_array[i], r, i, 0, n - i);
    r.clamp();
  }

  // (protected) r = "this * a" without lower n words, n > 0
  // "this" should be the larger one if appropriate.
  function bnpMultiplyUpperTo(a, n, r) {
    var r_array = r.array;
    var a_array = a.array;
    --n;
    var i = (r.t = this.t + a.t - n);
    r.s = 0; // assumes a,this >= 0
    while (--i >= 0) r_array[i] = 0;
    for (i = Math.max(n - this.t, 0); i < a.t; ++i)
      r_array[this.t + i - n] = this.am(n - i, a_array[i], r, 0, 0, this.t + i - n);
    r.clamp();
    r.drShiftTo(1, r);
  }

  // Barrett modular reduction
  function Barrett(m) {
    // setup Barrett
    this.r2 = nbi();
    this.q3 = nbi();
    BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
    this.mu = this.r2.divide(m);
    this.m = m;
  }

  function barrettConvert(x) {
    if (x.s < 0 || x.t > 2 * this.m.t) return x.mod(this.m);
    else if (x.compareTo(this.m) < 0) return x;
    else {
      var r = nbi();
      x.copyTo(r);
      this.reduce(r);
      return r;
    }
  }

  function barrettRevert(x) {
    return x;
  }

  // x = x mod m (HAC 14.42)
  function barrettReduce(x) {
    x.drShiftTo(this.m.t - 1, this.r2);
    if (x.t > this.m.t + 1) {
      x.t = this.m.t + 1;
      x.clamp();
    }
    this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
    this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
    while (x.compareTo(this.r2) < 0) x.dAddOffset(1, this.m.t + 1);
    x.subTo(this.r2, x);
    while (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
  }

  // r = x^2 mod m; x != r
  function barrettSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  }

  // r = x*y mod m; x,y != r
  function barrettMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r);
  }

  Barrett.prototype.convert = barrettConvert;
  Barrett.prototype.revert = barrettRevert;
  Barrett.prototype.reduce = barrettReduce;
  Barrett.prototype.mulTo = barrettMulTo;
  Barrett.prototype.sqrTo = barrettSqrTo;

  // (public) this^e % m (HAC 14.85)
  function bnModPow(e, m) {
    var e_array = e.array;
    var i = e.bitLength(),
      k,
      r = nbv(1),
      z;
    if (i <= 0) return r;
    else if (i < 18) k = 1;
    else if (i < 48) k = 3;
    else if (i < 144) k = 4;
    else if (i < 768) k = 5;
    else k = 6;
    if (i < 8) z = new Classic(m);
    else if (m.isEven()) z = new Barrett(m);
    else z = new Montgomery(m);

    // precomputation
    var g = new Array(),
      n = 3,
      k1 = k - 1,
      km = (1 << k) - 1;
    g[1] = z.convert(this);
    if (k > 1) {
      var g2 = nbi();
      z.sqrTo(g[1], g2);
      while (n <= km) {
        g[n] = nbi();
        z.mulTo(g2, g[n - 2], g[n]);
        n += 2;
      }
    }

    var j = e.t - 1,
      w,
      is1 = true,
      r2 = nbi(),
      t;
    i = nbits(e_array[j]) - 1;
    while (j >= 0) {
      if (i >= k1) w = (e_array[j] >> (i - k1)) & km;
      else {
        w = (e_array[j] & ((1 << (i + 1)) - 1)) << (k1 - i);
        if (j > 0) w |= e_array[j - 1] >> (BI_DB + i - k1);
      }

      n = k;
      while ((w & 1) == 0) {
        w >>= 1;
        --n;
      }
      if ((i -= n) < 0) {
        i += BI_DB;
        --j;
      }
      if (is1) {
        // ret == 1, don't bother squaring or multiplying it
        g[w].copyTo(r);
        is1 = false;
      } else {
        while (n > 1) {
          z.sqrTo(r, r2);
          z.sqrTo(r2, r);
          n -= 2;
        }
        if (n > 0) z.sqrTo(r, r2);
        else {
          t = r;
          r = r2;
          r2 = t;
        }
        z.mulTo(r2, g[w], r);
      }

      while (j >= 0 && (e_array[j] & (1 << i)) == 0) {
        z.sqrTo(r, r2);
        t = r;
        r = r2;
        r2 = t;
        if (--i < 0) {
          i = BI_DB - 1;
          --j;
        }
      }
    }
    return z.revert(r);
  }

  // (public) gcd(this,a) (HAC 14.54)
  function bnGCD(a) {
    var x = this.s < 0 ? this.negate() : this.clone();
    var y = a.s < 0 ? a.negate() : a.clone();
    if (x.compareTo(y) < 0) {
      var t = x;
      x = y;
      y = t;
    }
    var i = x.getLowestSetBit(),
      g = y.getLowestSetBit();
    if (g < 0) return x;
    if (i < g) g = i;
    if (g > 0) {
      x.rShiftTo(g, x);
      y.rShiftTo(g, y);
    }
    while (x.signum() > 0) {
      if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);
      if ((i = y.getLowestSetBit()) > 0) y.rShiftTo(i, y);
      if (x.compareTo(y) >= 0) {
        x.subTo(y, x);
        x.rShiftTo(1, x);
      } else {
        y.subTo(x, y);
        y.rShiftTo(1, y);
      }
    }
    if (g > 0) y.lShiftTo(g, y);
    return y;
  }

  // (protected) this % n, n < 2^26
  function bnpModInt(n) {
    var this_array = this.array;
    if (n <= 0) return 0;
    var d = BI_DV % n,
      r = this.s < 0 ? n - 1 : 0;
    if (this.t > 0)
      if (d == 0) r = this_array[0] % n;
      else for (var i = this.t - 1; i >= 0; --i) r = (d * r + this_array[i]) % n;
    return r;
  }

  // (public) 1/this % m (HAC 14.61)
  function bnModInverse(m) {
    var ac = m.isEven();
    if ((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
    var u = m.clone(),
      v = this.clone();
    var a = nbv(1),
      b = nbv(0),
      c = nbv(0),
      d = nbv(1);
    while (u.signum() != 0) {
      while (u.isEven()) {
        u.rShiftTo(1, u);
        if (ac) {
          if (!a.isEven() || !b.isEven()) {
            a.addTo(this, a);
            b.subTo(m, b);
          }
          a.rShiftTo(1, a);
        } else if (!b.isEven()) b.subTo(m, b);
        b.rShiftTo(1, b);
      }
      while (v.isEven()) {
        v.rShiftTo(1, v);
        if (ac) {
          if (!c.isEven() || !d.isEven()) {
            c.addTo(this, c);
            d.subTo(m, d);
          }
          c.rShiftTo(1, c);
        } else if (!d.isEven()) d.subTo(m, d);
        d.rShiftTo(1, d);
      }
      if (u.compareTo(v) >= 0) {
        u.subTo(v, u);
        if (ac) a.subTo(c, a);
        b.subTo(d, b);
      } else {
        v.subTo(u, v);
        if (ac) c.subTo(a, c);
        d.subTo(b, d);
      }
    }
    if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
    if (d.compareTo(m) >= 0) return d.subtract(m);
    if (d.signum() < 0) d.addTo(m, d);
    else return d;
    if (d.signum() < 0) return d.add(m);
    else return d;
  }

  var lowprimes = [
    2,
    3,
    5,
    7,
    11,
    13,
    17,
    19,
    23,
    29,
    31,
    37,
    41,
    43,
    47,
    53,
    59,
    61,
    67,
    71,
    73,
    79,
    83,
    89,
    97,
    101,
    103,
    107,
    109,
    113,
    127,
    131,
    137,
    139,
    149,
    151,
    157,
    163,
    167,
    173,
    179,
    181,
    191,
    193,
    197,
    199,
    211,
    223,
    227,
    229,
    233,
    239,
    241,
    251,
    257,
    263,
    269,
    271,
    277,
    281,
    283,
    293,
    307,
    311,
    313,
    317,
    331,
    337,
    347,
    349,
    353,
    359,
    367,
    373,
    379,
    383,
    389,
    397,
    401,
    409,
    419,
    421,
    431,
    433,
    439,
    443,
    449,
    457,
    461,
    463,
    467,
    479,
    487,
    491,
    499,
    503,
    509,
  ];
  var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];

  // (public) test primality with certainty >= 1-.5^t
  function bnIsProbablePrime(t) {
    var i,
      x = this.abs();
    var x_array = x.array;
    if (x.t == 1 && x_array[0] <= lowprimes[lowprimes.length - 1]) {
      for (i = 0; i < lowprimes.length; ++i) if (x_array[0] == lowprimes[i]) return true;
      return false;
    }
    if (x.isEven()) return false;
    i = 1;
    while (i < lowprimes.length) {
      var m = lowprimes[i],
        j = i + 1;
      while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];
      m = x.modInt(m);
      while (i < j) if (m % lowprimes[i++] == 0) return false;
    }
    return x.millerRabin(t);
  }

  // (protected) true if probably prime (HAC 4.24, Miller-Rabin)
  function bnpMillerRabin(t) {
    var n1 = this.subtract(BigInteger.ONE);
    var k = n1.getLowestSetBit();
    if (k <= 0) return false;
    var r = n1.shiftRight(k);
    t = (t + 1) >> 1;
    if (t > lowprimes.length) t = lowprimes.length;
    var a = nbi();
    for (var i = 0; i < t; ++i) {
      a.fromInt(lowprimes[i]);
      var y = a.modPow(r, this);
      if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
        var j = 1;
        while (j++ < k && y.compareTo(n1) != 0) {
          y = y.modPowInt(2, this);
          if (y.compareTo(BigInteger.ONE) == 0) return false;
        }
        if (y.compareTo(n1) != 0) return false;
      }
    }
    return true;
  }

  // protected
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.fromNumber = bnpFromNumber;
  BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
  BigInteger.prototype.changeBit = bnpChangeBit;
  BigInteger.prototype.addTo = bnpAddTo;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
  BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
  BigInteger.prototype.modInt = bnpModInt;
  BigInteger.prototype.millerRabin = bnpMillerRabin;

  // public
  BigInteger.prototype.clone = bnClone;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.byteValue = bnByteValue;
  BigInteger.prototype.shortValue = bnShortValue;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.toByteArray = bnToByteArray;
  BigInteger.prototype.equals = bnEquals;
  BigInteger.prototype.min = bnMin;
  BigInteger.prototype.max = bnMax;
  BigInteger.prototype.and = bnAnd;
  BigInteger.prototype.or = bnOr;
  BigInteger.prototype.xor = bnXor;
  BigInteger.prototype.andNot = bnAndNot;
  BigInteger.prototype.not = bnNot;
  BigInteger.prototype.shiftLeft = bnShiftLeft;
  BigInteger.prototype.shiftRight = bnShiftRight;
  BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
  BigInteger.prototype.bitCount = bnBitCount;
  BigInteger.prototype.testBit = bnTestBit;
  BigInteger.prototype.setBit = bnSetBit;
  BigInteger.prototype.clearBit = bnClearBit;
  BigInteger.prototype.flipBit = bnFlipBit;
  BigInteger.prototype.add = bnAdd;
  BigInteger.prototype.subtract = bnSubtract;
  BigInteger.prototype.multiply = bnMultiply;
  BigInteger.prototype.divide = bnDivide;
  BigInteger.prototype.remainder = bnRemainder;
  BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
  BigInteger.prototype.modPow = bnModPow;
  BigInteger.prototype.modInverse = bnModInverse;
  BigInteger.prototype.pow = bnPow;
  BigInteger.prototype.gcd = bnGCD;
  BigInteger.prototype.isProbablePrime = bnIsProbablePrime;

  // BigInteger interfaces not implemented in jsbn:

  // BigInteger(int signum, byte[] magnitude)
  // double doubleValue()
  // float floatValue()
  // int hashCode()
  // long longValue()
  // static BigInteger valueOf(long val)
  // prng4.js - uses Arcfour as a PRNG

  function Arcfour() {
    this.i = 0;
    this.j = 0;
    this.S = new Array();
  }

  // Initialize arcfour context from key, an array of ints, each from [0..255]
  function ARC4init(key) {
    var i, j, t;
    for (i = 0; i < 256; ++i) this.S[i] = i;
    j = 0;
    for (i = 0; i < 256; ++i) {
      j = (j + this.S[i] + key[i % key.length]) & 255;
      t = this.S[i];
      this.S[i] = this.S[j];
      this.S[j] = t;
    }
    this.i = 0;
    this.j = 0;
  }

  function ARC4next() {
    var t;
    this.i = (this.i + 1) & 255;
    this.j = (this.j + this.S[this.i]) & 255;
    t = this.S[this.i];
    this.S[this.i] = this.S[this.j];
    this.S[this.j] = t;
    return this.S[(t + this.S[this.i]) & 255];
  }

  Arcfour.prototype.init = ARC4init;
  Arcfour.prototype.next = ARC4next;

  // Plug in your RNG constructor here
  function prng_newstate() {
    return new Arcfour();
  }

  // Pool size must be a multiple of 4 and greater than 32.
  // An array of bytes the size of the pool will be passed to init()
  var rng_psize = 256;
  // Random number generator - requires a PRNG backend, e.g. prng4.js

  // For best results, put code like
  // <body onClick='rng_seed_time();' onKeyPress='rng_seed_time();'>
  // in your main HTML document.

  var rng_state;
  var rng_pool;
  var rng_pptr;

  // Mix in a 32-bit integer into the pool
  function rng_seed_int(x) {
    rng_pool[rng_pptr++] ^= x & 255;
    rng_pool[rng_pptr++] ^= (x >> 8) & 255;
    rng_pool[rng_pptr++] ^= (x >> 16) & 255;
    rng_pool[rng_pptr++] ^= (x >> 24) & 255;
    if (rng_pptr >= rng_psize) rng_pptr -= rng_psize;
  }

  // Mix in the current time (w/milliseconds) into the pool
  function rng_seed_time() {
    // Use pre-computed date to avoid making the benchmark
    // results dependent on the current date.
    rng_seed_int(1122926989487);
  }

  // Initialize the pool with junk if needed.
  if (rng_pool == null) {
    rng_pool = new Array();
    rng_pptr = 0;
    var t;
    while (rng_pptr < rng_psize) {
      // extract some randomness from Math.random()
      t = Math.floor(65536 * Math.random());
      rng_pool[rng_pptr++] = t >>> 8;
      rng_pool[rng_pptr++] = t & 255;
    }
    rng_pptr = 0;
    rng_seed_time();
    //rng_seed_int(window.screenX);
    //rng_seed_int(window.screenY);
  }

  function rng_get_byte() {
    if (rng_state == null) {
      rng_seed_time();
      rng_state = prng_newstate();
      rng_state.init(rng_pool);
      for (rng_pptr = 0; rng_pptr < rng_pool.length; ++rng_pptr) rng_pool[rng_pptr] = 0;
      rng_pptr = 0;
      //rng_pool = null;
    }
    // TODO: allow reseeding after first request
    return rng_state.next();
  }

  function rng_get_bytes(ba) {
    var i;
    for (i = 0; i < ba.length; ++i) ba[i] = rng_get_byte();
  }

  function SecureRandom() {}

  SecureRandom.prototype.nextBytes = rng_get_bytes;
  // Depends on jsbn.js and rng.js

  // convert a (hex) string to a bignum object
  function parseBigInt(str, r) {
    return new BigInteger(str, r);
  }

  function linebrk(s, n) {
    var ret = "";
    var i = 0;
    while (i + n < s.length) {
      ret += s.substring(i, i + n) + "\n";
      i += n;
    }
    return ret + s.substring(i, s.length);
  }

  function byte2Hex(b) {
    if (b < 0x10) return "0" + b.toString(16);
    else return b.toString(16);
  }

  // PKCS#1 (type 2, random) pad input string s to n bytes, and return a bigint
  function pkcs1pad2(s, n) {
    if (n < s.length + 11) {
      alert("Message too long for RSA");
      return null;
    }
    var ba = new Array();
    var i = s.length - 1;
    while (i >= 0 && n > 0) ba[--n] = s.charCodeAt(i--);
    ba[--n] = 0;
    var rng = new SecureRandom();
    var x = new Array();
    while (n > 2) {
      // random non-zero pad
      x[0] = 0;
      while (x[0] == 0) rng.nextBytes(x);
      ba[--n] = x[0];
    }
    ba[--n] = 2;
    ba[--n] = 0;
    return new BigInteger(ba);
  }

  // "empty" RSA key constructor
  function RSAKey() {
    this.n = null;
    this.e = 0;
    this.d = null;
    this.p = null;
    this.q = null;
    this.dmp1 = null;
    this.dmq1 = null;
    this.coeff = null;
  }

  // Set the public key fields N and e from hex strings
  function RSASetPublic(N, E) {
    if (N != null && E != null && N.length > 0 && E.length > 0) {
      this.n = parseBigInt(N, 16);
      this.e = parseInt(E, 16);
    } else alert("Invalid RSA public key");
  }

  // Perform raw public operation on "x": return x^e (mod n)
  function RSADoPublic(x) {
    return x.modPowInt(this.e, this.n);
  }

  // Return the PKCS#1 RSA encryption of "text" as an even-length hex string
  function RSAEncrypt(text) {
    var m = pkcs1pad2(text, (this.n.bitLength() + 7) >> 3);
    if (m == null) return null;
    var c = this.doPublic(m);
    if (c == null) return null;
    var h = c.toString(16);
    if ((h.length & 1) == 0) return h;
    else return "0" + h;
  }

  // Return the PKCS#1 RSA encryption of "text" as a Base64-encoded string
  //function RSAEncryptB64(text) {
  //  var h = this.encrypt(text);
  //  if(h) return hex2b64(h); else return null;
  //}

  // protected
  RSAKey.prototype.doPublic = RSADoPublic;

  // public
  RSAKey.prototype.setPublic = RSASetPublic;
  RSAKey.prototype.encrypt = RSAEncrypt;
  //RSAKey.prototype.encrypt_b64 = RSAEncryptB64;
  // Depends on rsa.js and jsbn2.js

  // Undo PKCS#1 (type 2, random) padding and, if valid, return the plaintext
  function pkcs1unpad2(d, n) {
    var b = d.toByteArray();
    var i = 0;
    while (i < b.length && b[i] == 0) ++i;
    if (b.length - i != n - 1 || b[i] != 2) return null;
    ++i;
    while (b[i] != 0) if (++i >= b.length) return null;
    var ret = "";
    while (++i < b.length) ret += String.fromCharCode(b[i]);
    return ret;
  }

  // Set the private key fields N, e, and d from hex strings
  function RSASetPrivate(N, E, D) {
    if (N != null && E != null && N.length > 0 && E.length > 0) {
      this.n = parseBigInt(N, 16);
      this.e = parseInt(E, 16);
      this.d = parseBigInt(D, 16);
    } else alert("Invalid RSA private key");
  }

  // Set the private key fields N, e, d and CRT params from hex strings
  function RSASetPrivateEx(N, E, D, P, Q, DP, DQ, C) {
    if (N != null && E != null && N.length > 0 && E.length > 0) {
      this.n = parseBigInt(N, 16);
      this.e = parseInt(E, 16);
      this.d = parseBigInt(D, 16);
      this.p = parseBigInt(P, 16);
      this.q = parseBigInt(Q, 16);
      this.dmp1 = parseBigInt(DP, 16);
      this.dmq1 = parseBigInt(DQ, 16);
      this.coeff = parseBigInt(C, 16);
    } else alert("Invalid RSA private key");
  }

  // Generate a new random private key B bits long, using public expt E
  function RSAGenerate(B, E) {
    var rng = new SecureRandom();
    var qs = B >> 1;
    this.e = parseInt(E, 16);
    var ee = new BigInteger(E, 16);
    for (;;) {
      for (;;) {
        this.p = new BigInteger(B - qs, 1, rng);
        if (
          this.p
            .subtract(BigInteger.ONE)
            .gcd(ee)
            .compareTo(BigInteger.ONE) == 0 &&
          this.p.isProbablePrime(10)
        )
          break;
      }
      for (;;) {
        this.q = new BigInteger(qs, 1, rng);
        if (
          this.q
            .subtract(BigInteger.ONE)
            .gcd(ee)
            .compareTo(BigInteger.ONE) == 0 &&
          this.q.isProbablePrime(10)
        )
          break;
      }
      if (this.p.compareTo(this.q) <= 0) {
        var t = this.p;
        this.p = this.q;
        this.q = t;
      }
      var p1 = this.p.subtract(BigInteger.ONE);
      var q1 = this.q.subtract(BigInteger.ONE);
      var phi = p1.multiply(q1);
      if (phi.gcd(ee).compareTo(BigInteger.ONE) == 0) {
        this.n = this.p.multiply(this.q);
        this.d = ee.modInverse(phi);
        this.dmp1 = this.d.mod(p1);
        this.dmq1 = this.d.mod(q1);
        this.coeff = this.q.modInverse(this.p);
        break;
      }
    }
  }

  // Perform raw private operation on "x": return x^d (mod n)
  function RSADoPrivate(x) {
    if (this.p == null || this.q == null) return x.modPow(this.d, this.n);

    // TODO: re-calculate any missing CRT params
    var xp = x.mod(this.p).modPow(this.dmp1, this.p);
    var xq = x.mod(this.q).modPow(this.dmq1, this.q);

    while (xp.compareTo(xq) < 0) xp = xp.add(this.p);
    return xp
      .subtract(xq)
      .multiply(this.coeff)
      .mod(this.p)
      .multiply(this.q)
      .add(xq);
  }

  // Return the PKCS#1 RSA decryption of "ctext".
  // "ctext" is an even-length hex string and the output is a plain string.
  function RSADecrypt(ctext) {
    var c = parseBigInt(ctext, 16);
    var m = this.doPrivate(c);
    if (m == null) return null;
    return pkcs1unpad2(m, (this.n.bitLength() + 7) >> 3);
  }

  // Return the PKCS#1 RSA decryption of "ctext".
  // "ctext" is a Base64-encoded string and the output is a plain string.
  //function RSAB64Decrypt(ctext) {
  //  var h = b64tohex(ctext);
  //  if(h) return this.decrypt(h); else return null;
  //}

  // protected
  RSAKey.prototype.doPrivate = RSADoPrivate;

  // public
  RSAKey.prototype.setPrivate = RSASetPrivate;
  RSAKey.prototype.setPrivateEx = RSASetPrivateEx;
  RSAKey.prototype.generate = RSAGenerate;
  RSAKey.prototype.decrypt = RSADecrypt;
  //RSAKey.prototype.b64_decrypt = RSAB64Decrypt;

  nValue =
    "a5261939975948bb7a58dffe5ff54e65f0498f9175f5a09288810b8975871e99af3b5dd94057b0fc07535f5f97444504fa35169d461d0d30cf0192e307727c065168c788771c561a9400fb49175e9e6aa4e23fe11af69e9412dd23b0cb6684c4c2429bce139e848ab26d0829073351f4acd36074eafd036a5eb83359d2a698d3";
  eValue = "10001";
  dValue =
    "8e9912f6d3645894e8d38cb58c0db81ff516cf4c7e5a14c7f1eddb1459d2cded4d8d293fc97aee6aefb861859c8b6a3d1dfe710463e1f9ddc72048c09751971c4a580aa51eb523357a3cc48d31cfad1d4a165066ed92d4748fb6571211da5cb14bc11b6e2df7c1a559e6d5ac1cd5c94703a22891464fba23d0d965086277a161";
  pValue =
    "d090ce58a92c75233a6486cb0a9209bf3583b64f540c76f5294bb97d285eed33aec220bde14b2417951178ac152ceab6da7090905b478195498b352048f15e7d";
  qValue =
    "cab575dc652bb66df15a0359609d51d1db184750c00c6698b90ef3465c99655103edbf0d54c56aec0ce3c4d22592338092a126a0cc49f65a4a30d222b411e58f";
  dmp1Value =
    "1a24bca8e273df2f0e47c199bbf678604e7df7215480c77c8db39f49b000ce2cf7500038acfff5433b7d582a01f1826e6f4d42e1c57f5e1fef7b12aabc59fd25";
  dmq1Value =
    "3d06982efbbe47339e1f6d36b1216b8a741d410b0c662f54f7118b27b9a4ec9d914337eb39841d8666f3034408cf94f5b62f11c402fc994fe15a05493150d9fd";
  coeffValue =
    "3a3e731acd8960b7ff9eb81a7ff93bd1cfa74cbd56987db58b4594fb09c09084db1734c8143f98b602b981aaa9243ca28deb69b5b280ee8dcee0fd2625e53250";

  setupEngine(am3, 28);

  var TEXT =
    "The quick brown fox jumped over the extremely lazy frog! " +
    "Now is the time for all good men to come to the party.";
  var encrypted;

  function encrypt() {
    var RSA = new RSAKey();
    RSA.setPublic(nValue, eValue);
    RSA.setPrivateEx(nValue, eValue, dValue, pValue, qValue, dmp1Value, dmq1Value, coeffValue);
    encrypted = RSA.encrypt(TEXT);
  }

  function decrypt() {
    var RSA = new RSAKey();
    RSA.setPublic(nValue, eValue);
    RSA.setPrivateEx(nValue, eValue, dValue, pValue, qValue, dmp1Value, dmq1Value, coeffValue);
    var decrypted = RSA.decrypt(encrypted);
    if (decrypted != TEXT) {
      throw new Error("Crypto operation failed");
    }
  }

  var RayTrace = new BenchmarkSuite("RayTrace", 739989, [new Benchmark("RayTrace", renderScene)]);

  // Variable used to hold a number that can be used to verify that
  // the scene was ray traced correctly.
  var checkNumber;

  // ------------------------------------------------------------------------
  // ------------------------------------------------------------------------

  // The following is a copy of parts of the Prototype JavaScript library:

  // Prototype JavaScript framework, version 1.5.0
  // (c) 2005-2007 Sam Stephenson
  //
  // Prototype is freely distributable under the terms of an MIT-style license.
  // For details, see the Prototype web site: http://prototype.conio.net/

  var Class = {
    create: function() {
      return function() {
        this.initialize.apply(this, arguments);
      };
    },
  };

  Object.extend = function(destination, source) {
    for (var property in source) {
      destination[property] = source[property];
    }
    return destination;
  };

  // ------------------------------------------------------------------------
  // ------------------------------------------------------------------------

  // The rest of this file is the actual ray tracer written by Adam
  // Burmister. It's a concatenation of the following files:
  //
  //   flog/color.js
  //   flog/light.js
  //   flog/vector.js
  //   flog/ray.js
  //   flog/scene.js
  //   flog/material/basematerial.js
  //   flog/material/solid.js
  //   flog/material/chessboard.js
  //   flog/shape/baseshape.js
  //   flog/shape/sphere.js
  //   flog/shape/plane.js
  //   flog/intersectioninfo.js
  //   flog/camera.js
  //   flog/background.js
  //   flog/engine.js

  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.Color = Class.create();

  Flog.RayTracer.Color.prototype = {
    red: 0.0,
    green: 0.0,
    blue: 0.0,

    initialize: function(r, g, b) {
      if (!r) r = 0.0;
      if (!g) g = 0.0;
      if (!b) b = 0.0;

      this.red = r;
      this.green = g;
      this.blue = b;
    },

    add: function(c1, c2) {
      var result = new Flog.RayTracer.Color(0, 0, 0);

      result.red = c1.red + c2.red;
      result.green = c1.green + c2.green;
      result.blue = c1.blue + c2.blue;

      return result;
    },

    addScalar: function(c1, s) {
      var result = new Flog.RayTracer.Color(0, 0, 0);

      result.red = c1.red + s;
      result.green = c1.green + s;
      result.blue = c1.blue + s;

      result.limit();

      return result;
    },

    subtract: function(c1, c2) {
      var result = new Flog.RayTracer.Color(0, 0, 0);

      result.red = c1.red - c2.red;
      result.green = c1.green - c2.green;
      result.blue = c1.blue - c2.blue;

      return result;
    },

    multiply: function(c1, c2) {
      var result = new Flog.RayTracer.Color(0, 0, 0);

      result.red = c1.red * c2.red;
      result.green = c1.green * c2.green;
      result.blue = c1.blue * c2.blue;

      return result;
    },

    multiplyScalar: function(c1, f) {
      var result = new Flog.RayTracer.Color(0, 0, 0);

      result.red = c1.red * f;
      result.green = c1.green * f;
      result.blue = c1.blue * f;

      return result;
    },

    divideFactor: function(c1, f) {
      var result = new Flog.RayTracer.Color(0, 0, 0);

      result.red = c1.red / f;
      result.green = c1.green / f;
      result.blue = c1.blue / f;

      return result;
    },

    limit: function() {
      this.red = this.red > 0.0 ? (this.red > 1.0 ? 1.0 : this.red) : 0.0;
      this.green = this.green > 0.0 ? (this.green > 1.0 ? 1.0 : this.green) : 0.0;
      this.blue = this.blue > 0.0 ? (this.blue > 1.0 ? 1.0 : this.blue) : 0.0;
    },

    distance: function(color) {
      var d = Math.abs(this.red - color.red) + Math.abs(this.green - color.green) + Math.abs(this.blue - color.blue);
      return d;
    },

    blend: function(c1, c2, w) {
      var result = new Flog.RayTracer.Color(0, 0, 0);
      result = Flog.RayTracer.Color.prototype.add(
        Flog.RayTracer.Color.prototype.multiplyScalar(c1, 1 - w),
        Flog.RayTracer.Color.prototype.multiplyScalar(c2, w)
      );
      return result;
    },

    brightness: function() {
      var r = Math.floor(this.red * 255);
      var g = Math.floor(this.green * 255);
      var b = Math.floor(this.blue * 255);
      return (r * 77 + g * 150 + b * 29) >> 8;
    },

    toString: function() {
      var r = Math.floor(this.red * 255);
      var g = Math.floor(this.green * 255);
      var b = Math.floor(this.blue * 255);

      return "rgb(" + r + "," + g + "," + b + ")";
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.Light = Class.create();

  Flog.RayTracer.Light.prototype = {
    position: null,
    color: null,
    intensity: 10.0,

    initialize: function(pos, color, intensity) {
      this.position = pos;
      this.color = color;
      this.intensity = intensity ? intensity : 10.0;
    },

    toString: function() {
      return "Light [" + this.position.x + "," + this.position.y + "," + this.position.z + "]";
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.Vector = Class.create();

  Flog.RayTracer.Vector.prototype = {
    x: 0.0,
    y: 0.0,
    z: 0.0,

    initialize: function(x, y, z) {
      this.x = x ? x : 0;
      this.y = y ? y : 0;
      this.z = z ? z : 0;
    },

    copy: function(vector) {
      this.x = vector.x;
      this.y = vector.y;
      this.z = vector.z;
    },

    normalize: function() {
      var m = this.magnitude();
      return new Flog.RayTracer.Vector(this.x / m, this.y / m, this.z / m);
    },

    magnitude: function() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },

    cross: function(w) {
      return new Flog.RayTracer.Vector(
        -this.z * w.y + this.y * w.z,
        this.z * w.x - this.x * w.z,
        -this.y * w.x + this.x * w.y
      );
    },

    dot: function(w) {
      return this.x * w.x + this.y * w.y + this.z * w.z;
    },

    add: function(v, w) {
      return new Flog.RayTracer.Vector(w.x + v.x, w.y + v.y, w.z + v.z);
    },

    subtract: function(v, w) {
      if (!w || !v) throw "Vectors must be defined [" + v + "," + w + "]";
      return new Flog.RayTracer.Vector(v.x - w.x, v.y - w.y, v.z - w.z);
    },

    multiplyVector: function(v, w) {
      return new Flog.RayTracer.Vector(v.x * w.x, v.y * w.y, v.z * w.z);
    },

    multiplyScalar: function(v, w) {
      return new Flog.RayTracer.Vector(v.x * w, v.y * w, v.z * w);
    },

    toString: function() {
      return "Vector [" + this.x + "," + this.y + "," + this.z + "]";
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.Ray = Class.create();

  Flog.RayTracer.Ray.prototype = {
    position: null,
    direction: null,
    initialize: function(pos, dir) {
      this.position = pos;
      this.direction = dir;
    },

    toString: function() {
      return "Ray [" + this.position + "," + this.direction + "]";
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.Scene = Class.create();

  Flog.RayTracer.Scene.prototype = {
    camera: null,
    shapes: [],
    lights: [],
    background: null,

    initialize: function() {
      this.camera = new Flog.RayTracer.Camera(
        new Flog.RayTracer.Vector(0, 0, -5),
        new Flog.RayTracer.Vector(0, 0, 1),
        new Flog.RayTracer.Vector(0, 1, 0)
      );
      this.shapes = new Array();
      this.lights = new Array();
      this.background = new Flog.RayTracer.Background(new Flog.RayTracer.Color(0, 0, 0.5), 0.2);
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};
  if (typeof Flog.RayTracer.Material == "undefined") Flog.RayTracer.Material = {};

  Flog.RayTracer.Material.BaseMaterial = Class.create();

  Flog.RayTracer.Material.BaseMaterial.prototype = {
    gloss: 2.0, // [0...infinity] 0 = matt
    transparency: 0.0, // 0=opaque
    reflection: 0.0, // [0...infinity] 0 = no reflection
    refraction: 0.5,
    hasTexture: false,

    initialize: function() {},

    getColor: function(u, v) {},

    wrapUp: function(t) {
      t = t % 2.0;
      if (t < -1) t += 2.0;
      if (t >= 1) t -= 2.0;
      return t;
    },

    toString: function() {
      return (
        "Material [gloss=" +
        this.gloss +
        ", transparency=" +
        this.transparency +
        ", hasTexture=" +
        this.hasTexture +
        "]"
      );
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.Material.Solid = Class.create();

  Flog.RayTracer.Material.Solid.prototype = Object.extend(new Flog.RayTracer.Material.BaseMaterial(), {
    initialize: function(color, reflection, refraction, transparency, gloss) {
      this.color = color;
      this.reflection = reflection;
      this.transparency = transparency;
      this.gloss = gloss;
      this.hasTexture = false;
    },

    getColor: function(u, v) {
      return this.color;
    },

    toString: function() {
      return (
        "SolidMaterial [gloss=" +
        this.gloss +
        ", transparency=" +
        this.transparency +
        ", hasTexture=" +
        this.hasTexture +
        "]"
      );
    },
  });
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.Material.Chessboard = Class.create();

  Flog.RayTracer.Material.Chessboard.prototype = Object.extend(new Flog.RayTracer.Material.BaseMaterial(), {
    colorEven: null,
    colorOdd: null,
    density: 0.5,

    initialize: function(colorEven, colorOdd, reflection, transparency, gloss, density) {
      this.colorEven = colorEven;
      this.colorOdd = colorOdd;
      this.reflection = reflection;
      this.transparency = transparency;
      this.gloss = gloss;
      this.density = density;
      this.hasTexture = true;
    },

    getColor: function(u, v) {
      var t = this.wrapUp(u * this.density) * this.wrapUp(v * this.density);

      if (t < 0.0) return this.colorEven;
      else return this.colorOdd;
    },

    toString: function() {
      return (
        "ChessMaterial [gloss=" +
        this.gloss +
        ", transparency=" +
        this.transparency +
        ", hasTexture=" +
        this.hasTexture +
        "]"
      );
    },
  });
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};
  if (typeof Flog.RayTracer.Shape == "undefined") Flog.RayTracer.Shape = {};

  Flog.RayTracer.Shape.Sphere = Class.create();

  Flog.RayTracer.Shape.Sphere.prototype = {
    initialize: function(pos, radius, material) {
      this.radius = radius;
      this.position = pos;
      this.material = material;
    },

    intersect: function(ray) {
      var info = new Flog.RayTracer.IntersectionInfo();
      info.shape = this;

      var dst = Flog.RayTracer.Vector.prototype.subtract(ray.position, this.position);

      var B = dst.dot(ray.direction);
      var C = dst.dot(dst) - this.radius * this.radius;
      var D = B * B - C;

      if (D > 0) {
        // intersection!
        info.isHit = true;
        info.distance = -B - Math.sqrt(D);
        info.position = Flog.RayTracer.Vector.prototype.add(
          ray.position,
          Flog.RayTracer.Vector.prototype.multiplyScalar(ray.direction, info.distance)
        );
        info.normal = Flog.RayTracer.Vector.prototype.subtract(info.position, this.position).normalize();

        info.color = this.material.getColor(0, 0);
      } else {
        info.isHit = false;
      }
      return info;
    },

    toString: function() {
      return "Sphere [position=" + this.position + ", radius=" + this.radius + "]";
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};
  if (typeof Flog.RayTracer.Shape == "undefined") Flog.RayTracer.Shape = {};

  Flog.RayTracer.Shape.Plane = Class.create();

  Flog.RayTracer.Shape.Plane.prototype = {
    d: 0.0,

    initialize: function(pos, d, material) {
      this.position = pos;
      this.d = d;
      this.material = material;
    },

    intersect: function(ray) {
      var info = new Flog.RayTracer.IntersectionInfo();

      var Vd = this.position.dot(ray.direction);
      if (Vd == 0) return info; // no intersection

      var t = -(this.position.dot(ray.position) + this.d) / Vd;
      if (t <= 0) return info;

      info.shape = this;
      info.isHit = true;
      info.position = Flog.RayTracer.Vector.prototype.add(
        ray.position,
        Flog.RayTracer.Vector.prototype.multiplyScalar(ray.direction, t)
      );
      info.normal = this.position;
      info.distance = t;

      if (this.material.hasTexture) {
        var vU = new Flog.RayTracer.Vector(this.position.y, this.position.z, -this.position.x);
        var vV = vU.cross(this.position);
        var u = info.position.dot(vU);
        var v = info.position.dot(vV);
        info.color = this.material.getColor(u, v);
      } else {
        info.color = this.material.getColor(0, 0);
      }

      return info;
    },

    toString: function() {
      return "Plane [" + this.position + ", d=" + this.d + "]";
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.IntersectionInfo = Class.create();

  Flog.RayTracer.IntersectionInfo.prototype = {
    isHit: false,
    hitCount: 0,
    shape: null,
    position: null,
    normal: null,
    color: null,
    distance: null,

    initialize: function() {
      this.color = new Flog.RayTracer.Color(0, 0, 0);
    },

    toString: function() {
      return "Intersection [" + this.position + "]";
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.Camera = Class.create();

  Flog.RayTracer.Camera.prototype = {
    position: null,
    lookAt: null,
    equator: null,
    up: null,
    screen: null,

    initialize: function(pos, lookAt, up) {
      this.position = pos;
      this.lookAt = lookAt;
      this.up = up;
      this.equator = lookAt.normalize().cross(this.up);
      this.screen = Flog.RayTracer.Vector.prototype.add(this.position, this.lookAt);
    },

    getRay: function(vx, vy) {
      var pos = Flog.RayTracer.Vector.prototype.subtract(
        this.screen,
        Flog.RayTracer.Vector.prototype.subtract(
          Flog.RayTracer.Vector.prototype.multiplyScalar(this.equator, vx),
          Flog.RayTracer.Vector.prototype.multiplyScalar(this.up, vy)
        )
      );
      pos.y = pos.y * -1;
      var dir = Flog.RayTracer.Vector.prototype.subtract(pos, this.position);

      var ray = new Flog.RayTracer.Ray(pos, dir.normalize());

      return ray;
    },

    toString: function() {
      return "Ray []";
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.Background = Class.create();

  Flog.RayTracer.Background.prototype = {
    color: null,
    ambience: 0.0,

    initialize: function(color, ambience) {
      this.color = color;
      this.ambience = ambience;
    },
  };
  /* Fake a Flog.* namespace */
  if (typeof Flog == "undefined") var Flog = {};
  if (typeof Flog.RayTracer == "undefined") Flog.RayTracer = {};

  Flog.RayTracer.Engine = Class.create();

  Flog.RayTracer.Engine.prototype = {
    canvas: null /* 2d context we can render to */,

    initialize: function(options) {
      this.options = Object.extend(
        {
          canvasHeight: 100,
          canvasWidth: 100,
          pixelWidth: 2,
          pixelHeight: 2,
          renderDiffuse: false,
          renderShadows: false,
          renderHighlights: false,
          renderReflections: false,
          rayDepth: 2,
        },
        options || {}
      );

      this.options.canvasHeight /= this.options.pixelHeight;
      this.options.canvasWidth /= this.options.pixelWidth;

      /* TODO: dynamically include other scripts */
    },

    setPixel: function(x, y, color) {
      var pxW, pxH;
      pxW = this.options.pixelWidth;
      pxH = this.options.pixelHeight;

      if (this.canvas) {
        this.canvas.fillStyle = color.toString();
        this.canvas.fillRect(x * pxW, y * pxH, pxW, pxH);
      } else {
        if (x === y) {
          checkNumber += color.brightness();
        }
        // print(x * pxW, y * pxH, pxW, pxH);
      }
    },

    renderScene: function(scene, canvas) {
      checkNumber = 0;
      /* Get canvas */
      if (canvas) {
        this.canvas = canvas.getContext("2d");
      } else {
        this.canvas = null;
      }

      var canvasHeight = this.options.canvasHeight;
      var canvasWidth = this.options.canvasWidth;

      for (var y = 0; y < canvasHeight; y++) {
        for (var x = 0; x < canvasWidth; x++) {
          var yp = ((y * 1.0) / canvasHeight) * 2 - 1;
          var xp = ((x * 1.0) / canvasWidth) * 2 - 1;

          var ray = scene.camera.getRay(xp, yp);

          var color = this.getPixelColor(ray, scene);

          this.setPixel(x, y, color);
        }
      }
      if (checkNumber !== 2321) {
        throw new Error("Scene rendered incorrectly");
      }
    },

    getPixelColor: function(ray, scene) {
      var info = this.testIntersection(ray, scene, null);
      if (info.isHit) {
        var color = this.rayTrace(info, ray, scene, 0);
        return color;
      }
      return scene.background.color;
    },

    testIntersection: function(ray, scene, exclude) {
      var hits = 0;
      var best = new Flog.RayTracer.IntersectionInfo();
      best.distance = 2000;

      for (var i = 0; i < scene.shapes.length; i++) {
        var shape = scene.shapes[i];

        if (shape != exclude) {
          var info = shape.intersect(ray);
          if (info.isHit && info.distance >= 0 && info.distance < best.distance) {
            best = info;
            hits++;
          }
        }
      }
      best.hitCount = hits;
      return best;
    },

    getReflectionRay: function(P, N, V) {
      var c1 = -N.dot(V);
      var R1 = Flog.RayTracer.Vector.prototype.add(Flog.RayTracer.Vector.prototype.multiplyScalar(N, 2 * c1), V);
      return new Flog.RayTracer.Ray(P, R1);
    },

    rayTrace: function(info, ray, scene, depth) {
      // Calc ambient
      var color = Flog.RayTracer.Color.prototype.multiplyScalar(info.color, scene.background.ambience);
      var oldColor = color;
      var shininess = Math.pow(10, info.shape.material.gloss + 1);

      for (var i = 0; i < scene.lights.length; i++) {
        var light = scene.lights[i];

        // Calc diffuse lighting
        var v = Flog.RayTracer.Vector.prototype.subtract(light.position, info.position).normalize();

        if (this.options.renderDiffuse) {
          var L = v.dot(info.normal);
          if (L > 0.0) {
            color = Flog.RayTracer.Color.prototype.add(
              color,
              Flog.RayTracer.Color.prototype.multiply(
                info.color,
                Flog.RayTracer.Color.prototype.multiplyScalar(light.color, L)
              )
            );
          }
        }

        // The greater the depth the more accurate the colours, but
        // this is exponentially (!) expensive
        if (depth <= this.options.rayDepth) {
          // calculate reflection ray
          if (this.options.renderReflections && info.shape.material.reflection > 0) {
            var reflectionRay = this.getReflectionRay(info.position, info.normal, ray.direction);
            var refl = this.testIntersection(reflectionRay, scene, info.shape);

            if (refl.isHit && refl.distance > 0) {
              refl.color = this.rayTrace(refl, reflectionRay, scene, depth + 1);
            } else {
              refl.color = scene.background.color;
            }

            color = Flog.RayTracer.Color.prototype.blend(color, refl.color, info.shape.material.reflection);
          }

          // Refraction
          /* TODO */
        }

        /* Render shadows and highlights */

        var shadowInfo = new Flog.RayTracer.IntersectionInfo();

        if (this.options.renderShadows) {
          var shadowRay = new Flog.RayTracer.Ray(info.position, v);

          shadowInfo = this.testIntersection(shadowRay, scene, info.shape);
          if (shadowInfo.isHit && shadowInfo.shape != info.shape /*&& shadowInfo.shape.type != 'PLANE'*/) {
            var vA = Flog.RayTracer.Color.prototype.multiplyScalar(color, 0.5);
            var dB = 0.5 * Math.pow(shadowInfo.shape.material.transparency, 0.5);
            color = Flog.RayTracer.Color.prototype.addScalar(vA, dB);
          }
        }

        // Phong specular highlights
        if (this.options.renderHighlights && !shadowInfo.isHit && info.shape.material.gloss > 0) {
          var Lv = Flog.RayTracer.Vector.prototype.subtract(info.shape.position, light.position).normalize();

          var E = Flog.RayTracer.Vector.prototype.subtract(scene.camera.position, info.shape.position).normalize();

          var H = Flog.RayTracer.Vector.prototype.subtract(E, Lv).normalize();

          var glossWeight = Math.pow(Math.max(info.normal.dot(H), 0), shininess);
          color = Flog.RayTracer.Color.prototype.add(
            Flog.RayTracer.Color.prototype.multiplyScalar(light.color, glossWeight),
            color
          );
        }
      }
      color.limit();
      return color;
    },
  };

  function renderScene() {
    var scene = new Flog.RayTracer.Scene();

    scene.camera = new Flog.RayTracer.Camera(
      new Flog.RayTracer.Vector(0, 0, -15),
      new Flog.RayTracer.Vector(-0.2, 0, 5),
      new Flog.RayTracer.Vector(0, 1, 0)
    );

    scene.background = new Flog.RayTracer.Background(new Flog.RayTracer.Color(0.5, 0.5, 0.5), 0.4);

    var sphere = new Flog.RayTracer.Shape.Sphere(
      new Flog.RayTracer.Vector(-1.5, 1.5, 2),
      1.5,
      new Flog.RayTracer.Material.Solid(new Flog.RayTracer.Color(0, 0.5, 0.5), 0.3, 0.0, 0.0, 2.0)
    );

    var sphere1 = new Flog.RayTracer.Shape.Sphere(
      new Flog.RayTracer.Vector(1, 0.25, 1),
      0.5,
      new Flog.RayTracer.Material.Solid(new Flog.RayTracer.Color(0.9, 0.9, 0.9), 0.1, 0.0, 0.0, 1.5)
    );

    var plane = new Flog.RayTracer.Shape.Plane(
      new Flog.RayTracer.Vector(0.1, 0.9, -0.5).normalize(),
      1.2,
      new Flog.RayTracer.Material.Chessboard(
        new Flog.RayTracer.Color(1, 1, 1),
        new Flog.RayTracer.Color(0, 0, 0),
        0.2,
        0.0,
        1.0,
        0.7
      )
    );

    scene.shapes.push(plane);
    scene.shapes.push(sphere);
    scene.shapes.push(sphere1);

    var light = new Flog.RayTracer.Light(new Flog.RayTracer.Vector(5, 10, -1), new Flog.RayTracer.Color(0.8, 0.8, 0.8));

    var light1 = new Flog.RayTracer.Light(
      new Flog.RayTracer.Vector(-3, 5, -15),
      new Flog.RayTracer.Color(0.8, 0.8, 0.8),
      100
    );

    scene.lights.push(light);
    scene.lights.push(light1);

    var imageWidth = 100; // $F('imageWidth');
    var imageHeight = 100; // $F('imageHeight');
    var pixelSize = "5,5".split(","); //  $F('pixelSize').split(',');
    var renderDiffuse = true; // $F('renderDiffuse');
    var renderShadows = true; // $F('renderShadows');
    var renderHighlights = true; // $F('renderHighlights');
    var renderReflections = true; // $F('renderReflections');
    var rayDepth = 2; //$F('rayDepth');

    var raytracer = new Flog.RayTracer.Engine({
      canvasWidth: imageWidth,
      canvasHeight: imageHeight,
      pixelWidth: pixelSize[0],
      pixelHeight: pixelSize[1],
      renderDiffuse: renderDiffuse,
      renderHighlights: renderHighlights,
      renderShadows: renderShadows,
      renderReflections: renderReflections,
      rayDepth: rayDepth,
    });

    raytracer.renderScene(scene, null, 0);
  }

  var NavierStokes = new BenchmarkSuite("NavierStokes", 1484000, [
    new Benchmark("NavierStokes", runNavierStokes, setupNavierStokes, tearDownNavierStokes),
  ]);

  var solver = null;

  function runNavierStokes() {
    solver.update();
  }

  function setupNavierStokes() {
    solver = new FluidField(null);
    solver.setResolution(128, 128);
    solver.setIterations(20);
    solver.setDisplayFunction(function() {});
    solver.setUICallback(prepareFrame);
    solver.reset();
  }

  function tearDownNavierStokes() {
    solver = null;
  }

  function addPoints(field) {
    var n = 64;
    for (var i = 1; i <= n; i++) {
      field.setVelocity(i, i, n, n);
      field.setDensity(i, i, 5);
      field.setVelocity(i, n - i, -n, -n);
      field.setDensity(i, n - i, 20);
      field.setVelocity(128 - i, n + i, -n, -n);
      field.setDensity(128 - i, n + i, 30);
    }
  }

  var framesTillAddingPoints = 0;
  var framesBetweenAddingPoints = 5;

  function prepareFrame(field) {
    if (framesTillAddingPoints == 0) {
      addPoints(field);
      framesTillAddingPoints = framesBetweenAddingPoints;
      framesBetweenAddingPoints++;
    } else {
      framesTillAddingPoints--;
    }
  }

  // Code from Oliver Hunt (http://nerget.com/fluidSim/pressure.js) starts here.
  function FluidField(canvas) {
    function addFields(x, s, dt) {
      for (var i = 0; i < size; i++) x[i] += dt * s[i];
    }

    function set_bnd(b, x) {
      if (b === 1) {
        for (var i = 1; i <= width; i++) {
          x[i] = x[i + rowSize];
          x[i + (height + 1) * rowSize] = x[i + height * rowSize];
        }

        for (var j = 1; i <= height; i++) {
          x[j * rowSize] = -x[1 + j * rowSize];
          x[width + 1 + j * rowSize] = -x[width + j * rowSize];
        }
      } else if (b === 2) {
        for (var i = 1; i <= width; i++) {
          x[i] = -x[i + rowSize];
          x[i + (height + 1) * rowSize] = -x[i + height * rowSize];
        }

        for (var j = 1; j <= height; j++) {
          x[j * rowSize] = x[1 + j * rowSize];
          x[width + 1 + j * rowSize] = x[width + j * rowSize];
        }
      } else {
        for (var i = 1; i <= width; i++) {
          x[i] = x[i + rowSize];
          x[i + (height + 1) * rowSize] = x[i + height * rowSize];
        }

        for (var j = 1; j <= height; j++) {
          x[j * rowSize] = x[1 + j * rowSize];
          x[width + 1 + j * rowSize] = x[width + j * rowSize];
        }
      }
      var maxEdge = (height + 1) * rowSize;
      x[0] = 0.5 * (x[1] + x[rowSize]);
      x[maxEdge] = 0.5 * (x[1 + maxEdge] + x[height * rowSize]);
      x[width + 1] = 0.5 * (x[width] + x[width + 1 + rowSize]);
      x[width + 1 + maxEdge] = 0.5 * (x[width + maxEdge] + x[width + 1 + height * rowSize]);
    }

    function lin_solve(b, x, x0, a, c) {
      if (a === 0 && c === 1) {
        for (var j = 1; j <= height; j++) {
          var currentRow = j * rowSize;
          ++currentRow;
          for (var i = 0; i < width; i++) {
            x[currentRow] = x0[currentRow];
            ++currentRow;
          }
        }
        set_bnd(b, x);
      } else {
        var invC = 1 / c;
        for (var k = 0; k < iterations; k++) {
          for (var j = 1; j <= height; j++) {
            var lastRow = (j - 1) * rowSize;
            var currentRow = j * rowSize;
            var nextRow = (j + 1) * rowSize;
            var lastX = x[currentRow];
            ++currentRow;
            for (var i = 1; i <= width; i++)
              lastX = x[currentRow] =
                (x0[currentRow] + a * (lastX + x[++currentRow] + x[++lastRow] + x[++nextRow])) * invC;
          }
          set_bnd(b, x);
        }
      }
    }

    function diffuse(b, x, x0, dt) {
      var a = 0;
      lin_solve(b, x, x0, a, 1 + 4 * a);
    }

    function lin_solve2(x, x0, y, y0, a, c) {
      if (a === 0 && c === 1) {
        for (var j = 1; j <= height; j++) {
          var currentRow = j * rowSize;
          ++currentRow;
          for (var i = 0; i < width; i++) {
            x[currentRow] = x0[currentRow];
            y[currentRow] = y0[currentRow];
            ++currentRow;
          }
        }
        set_bnd(1, x);
        set_bnd(2, y);
      } else {
        var invC = 1 / c;
        for (var k = 0; k < iterations; k++) {
          for (var j = 1; j <= height; j++) {
            var lastRow = (j - 1) * rowSize;
            var currentRow = j * rowSize;
            var nextRow = (j + 1) * rowSize;
            var lastX = x[currentRow];
            var lastY = y[currentRow];
            ++currentRow;
            for (var i = 1; i <= width; i++) {
              lastX = x[currentRow] = (x0[currentRow] + a * (lastX + x[currentRow] + x[lastRow] + x[nextRow])) * invC;
              lastY = y[currentRow] =
                (y0[currentRow] + a * (lastY + y[++currentRow] + y[++lastRow] + y[++nextRow])) * invC;
            }
          }
          set_bnd(1, x);
          set_bnd(2, y);
        }
      }
    }

    function diffuse2(x, x0, y, y0, dt) {
      var a = 0;
      lin_solve2(x, x0, y, y0, a, 1 + 4 * a);
    }

    function advect(b, d, d0, u, v, dt) {
      var Wdt0 = dt * width;
      var Hdt0 = dt * height;
      var Wp5 = width + 0.5;
      var Hp5 = height + 0.5;
      for (var j = 1; j <= height; j++) {
        var pos = j * rowSize;
        for (var i = 1; i <= width; i++) {
          var x = i - Wdt0 * u[++pos];
          var y = j - Hdt0 * v[pos];
          if (x < 0.5) x = 0.5;
          else if (x > Wp5) x = Wp5;
          var i0 = x | 0;
          var i1 = i0 + 1;
          if (y < 0.5) y = 0.5;
          else if (y > Hp5) y = Hp5;
          var j0 = y | 0;
          var j1 = j0 + 1;
          var s1 = x - i0;
          var s0 = 1 - s1;
          var t1 = y - j0;
          var t0 = 1 - t1;
          var row1 = j0 * rowSize;
          var row2 = j1 * rowSize;
          d[pos] = s0 * (t0 * d0[i0 + row1] + t1 * d0[i0 + row2]) + s1 * (t0 * d0[i1 + row1] + t1 * d0[i1 + row2]);
        }
      }
      set_bnd(b, d);
    }

    function project(u, v, p, div) {
      var h = -0.5 / Math.sqrt(width * height);
      for (var j = 1; j <= height; j++) {
        var row = j * rowSize;
        var previousRow = (j - 1) * rowSize;
        var prevValue = row - 1;
        var currentRow = row;
        var nextValue = row + 1;
        var nextRow = (j + 1) * rowSize;
        for (var i = 1; i <= width; i++) {
          div[++currentRow] = h * (u[++nextValue] - u[++prevValue] + v[++nextRow] - v[++previousRow]);
          p[currentRow] = 0;
        }
      }
      set_bnd(0, div);
      set_bnd(0, p);

      lin_solve(0, p, div, 1, 4);
      var wScale = 0.5 * width;
      var hScale = 0.5 * height;
      for (var j = 1; j <= height; j++) {
        var prevPos = j * rowSize - 1;
        var currentPos = j * rowSize;
        var nextPos = j * rowSize + 1;
        var prevRow = (j - 1) * rowSize;
        var currentRow = j * rowSize;
        var nextRow = (j + 1) * rowSize;

        for (var i = 1; i <= width; i++) {
          u[++currentPos] -= wScale * (p[++nextPos] - p[++prevPos]);
          v[currentPos] -= hScale * (p[++nextRow] - p[++prevRow]);
        }
      }
      set_bnd(1, u);
      set_bnd(2, v);
    }

    function dens_step(x, x0, u, v, dt) {
      addFields(x, x0, dt);
      diffuse(0, x0, x, dt);
      advect(0, x, x0, u, v, dt);
    }

    function vel_step(u, v, u0, v0, dt) {
      addFields(u, u0, dt);
      addFields(v, v0, dt);
      var temp = u0;
      u0 = u;
      u = temp;
      var temp = v0;
      v0 = v;
      v = temp;
      diffuse2(u, u0, v, v0, dt);
      project(u, v, u0, v0);
      var temp = u0;
      u0 = u;
      u = temp;
      var temp = v0;
      v0 = v;
      v = temp;
      advect(1, u, u0, u0, v0, dt);
      advect(2, v, v0, u0, v0, dt);
      project(u, v, u0, v0);
    }
    var uiCallback = function(d, u, v) {};

    function Field(dens, u, v) {
      // Just exposing the fields here rather than using accessors is a measurable win during display (maybe 5%)
      // but makes the code ugly.
      this.setDensity = function(x, y, d) {
        dens[x + 1 + (y + 1) * rowSize] = d;
      };
      this.getDensity = function(x, y) {
        return dens[x + 1 + (y + 1) * rowSize];
      };
      this.setVelocity = function(x, y, xv, yv) {
        u[x + 1 + (y + 1) * rowSize] = xv;
        v[x + 1 + (y + 1) * rowSize] = yv;
      };
      this.getXVelocity = function(x, y) {
        return u[x + 1 + (y + 1) * rowSize];
      };
      this.getYVelocity = function(x, y) {
        return v[x + 1 + (y + 1) * rowSize];
      };
      this.width = function() {
        return width;
      };
      this.height = function() {
        return height;
      };
    }
    function queryUI(d, u, v) {
      for (var i = 0; i < size; i++) u[i] = v[i] = d[i] = 0.0;
      uiCallback(new Field(d, u, v));
    }

    this.update = function() {
      queryUI(dens_prev, u_prev, v_prev);
      vel_step(u, v, u_prev, v_prev, dt);
      dens_step(dens, dens_prev, u, v, dt);
      displayFunc(new Field(dens, u, v));
    };
    this.setDisplayFunction = function(func) {
      displayFunc = func;
    };

    this.iterations = function() {
      return iterations;
    };
    this.setIterations = function(iters) {
      if (iters > 0 && iters <= 100) iterations = iters;
    };
    this.setUICallback = function(callback) {
      uiCallback = callback;
    };
    var iterations = 10;
    var visc = 0.5;
    var dt = 0.1;
    var dens;
    var dens_prev;
    var u;
    var u_prev;
    var v;
    var v_prev;
    var width;
    var height;
    var rowSize;
    var size;
    var displayFunc;
    function reset() {
      rowSize = width + 2;
      size = (width + 2) * (height + 2);
      dens = new Array(size);
      dens_prev = new Array(size);
      u = new Array(size);
      u_prev = new Array(size);
      v = new Array(size);
      v_prev = new Array(size);
      for (var i = 0; i < size; i++) dens_prev[i] = u_prev[i] = v_prev[i] = dens[i] = u[i] = v[i] = 0;
    }
    this.reset = reset;
    this.setResolution = function(hRes, wRes) {
      var res = wRes * hRes;
      if (res > 0 && res < 1000000 && (wRes != width || hRes != height)) {
        width = wRes;
        height = hRes;
        reset();
        return true;
      }
      return false;
    };
    this.setResolution(64, 64);
  }

  var DeltaBlue = new BenchmarkSuite("DeltaBlue", 66118, [new Benchmark("DeltaBlue", deltaBlue)]);

  /**
   * A JavaScript implementation of the DeltaBlue constraint-solving
   * algorithm, as described in:
   *
   * "The DeltaBlue Algorithm: An Incremental Constraint Hierarchy Solver"
   *   Bjorn N. Freeman-Benson and John Maloney
   *   January 1990 Communications of the ACM,
   *   also available as University of Washington TR 89-08-06.
   *
   * Beware: this benchmark is written in a grotesque style where
   * the constraint model is built by side-effects from constructors.
   * I've kept it this way to avoid deviating too much from the original
   * implementation.
   */

  /* --- O b j e c t   M o d e l --- */

  Object.prototype.inheritsFrom = function(shuper) {
    function Inheriter() {}
    Inheriter.prototype = shuper.prototype;
    this.prototype = new Inheriter();
    this.superConstructor = shuper;
  };

  function OrderedCollection() {
    this.elms = new Array();
  }

  OrderedCollection.prototype.add = function(elm) {
    this.elms.push(elm);
  };

  OrderedCollection.prototype.at = function(index) {
    return this.elms[index];
  };

  OrderedCollection.prototype.size = function() {
    return this.elms.length;
  };

  OrderedCollection.prototype.removeFirst = function() {
    return this.elms.pop();
  };

  OrderedCollection.prototype.remove = function(elm) {
    var index = 0,
      skipped = 0;
    for (var i = 0; i < this.elms.length; i++) {
      var value = this.elms[i];
      if (value != elm) {
        this.elms[index] = value;
        index++;
      } else {
        skipped++;
      }
    }
    for (var i = 0; i < skipped; i++) this.elms.pop();
  };

  /* --- *
   * S t r e n g t h
   * --- */

  /**
   * Strengths are used to measure the relative importance of constraints.
   * New strengths may be inserted in the strength hierarchy without
   * disrupting current constraints.  Strengths cannot be created outside
   * this class, so pointer comparison can be used for value comparison.
   */
  function Strength(strengthValue, name) {
    this.strengthValue = strengthValue;
    this.name = name;
  }

  Strength.stronger = function(s1, s2) {
    return s1.strengthValue < s2.strengthValue;
  };

  Strength.weaker = function(s1, s2) {
    return s1.strengthValue > s2.strengthValue;
  };

  Strength.weakestOf = function(s1, s2) {
    return this.weaker(s1, s2) ? s1 : s2;
  };

  Strength.strongest = function(s1, s2) {
    return this.stronger(s1, s2) ? s1 : s2;
  };

  Strength.prototype.nextWeaker = function() {
    switch (this.strengthValue) {
      case 0:
        return Strength.WEAKEST;
      case 1:
        return Strength.WEAK_DEFAULT;
      case 2:
        return Strength.NORMAL;
      case 3:
        return Strength.STRONG_DEFAULT;
      case 4:
        return Strength.PREFERRED;
      case 5:
        return Strength.REQUIRED;
    }
  };

  // Strength constants.
  Strength.REQUIRED = new Strength(0, "required");
  Strength.STONG_PREFERRED = new Strength(1, "strongPreferred");
  Strength.PREFERRED = new Strength(2, "preferred");
  Strength.STRONG_DEFAULT = new Strength(3, "strongDefault");
  Strength.NORMAL = new Strength(4, "normal");
  Strength.WEAK_DEFAULT = new Strength(5, "weakDefault");
  Strength.WEAKEST = new Strength(6, "weakest");

  /* --- *
   * C o n s t r a i n t
   * --- */

  /**
   * An abstract class representing a system-maintainable relationship
   * (or "constraint") between a set of variables. A constraint supplies
   * a strength instance variable; concrete subclasses provide a means
   * of storing the constrained variables and other information required
   * to represent a constraint.
   */
  function Constraint(strength) {
    this.strength = strength;
  }

  /**
   * Activate this constraint and attempt to satisfy it.
   */
  Constraint.prototype.addConstraint = function() {
    this.addToGraph();
    planner.incrementalAdd(this);
  };

  /**
   * Attempt to find a way to enforce this constraint. If successful,
   * record the solution, perhaps modifying the current dataflow
   * graph. Answer the constraint that this constraint overrides, if
   * there is one, or nil, if there isn't.
   * Assume: I am not already satisfied.
   */
  Constraint.prototype.satisfy = function(mark) {
    this.chooseMethod(mark);
    if (!this.isSatisfied()) {
      if (this.strength == Strength.REQUIRED) alert("Could not satisfy a required constraint!");
      return null;
    }
    this.markInputs(mark);
    var out = this.output();
    var overridden = out.determinedBy;
    if (overridden != null) overridden.markUnsatisfied();
    out.determinedBy = this;
    if (!planner.addPropagate(this, mark)) alert("Cycle encountered");
    out.mark = mark;
    return overridden;
  };

  Constraint.prototype.destroyConstraint = function() {
    if (this.isSatisfied()) planner.incrementalRemove(this);
    else this.removeFromGraph();
  };

  /**
   * Normal constraints are not input constraints.  An input constraint
   * is one that depends on external state, such as the mouse, the
   * keybord, a clock, or some arbitraty piece of imperative code.
   */
  Constraint.prototype.isInput = function() {
    return false;
  };

  /* --- *
   * U n a r y   C o n s t r a i n t
   * --- */

  /**
   * Abstract superclass for constraints having a single possible output
   * variable.
   */
  function UnaryConstraint(v, strength) {
    UnaryConstraint.superConstructor.call(this, strength);
    this.myOutput = v;
    this.satisfied = false;
    this.addConstraint();
  }

  UnaryConstraint.inheritsFrom(Constraint);

  /**
   * Adds this constraint to the constraint graph
   */
  UnaryConstraint.prototype.addToGraph = function() {
    this.myOutput.addConstraint(this);
    this.satisfied = false;
  };

  /**
   * Decides if this constraint can be satisfied and records that
   * decision.
   */
  UnaryConstraint.prototype.chooseMethod = function(mark) {
    this.satisfied = this.myOutput.mark != mark && Strength.stronger(this.strength, this.myOutput.walkStrength);
  };

  /**
   * Returns true if this constraint is satisfied in the current solution.
   */
  UnaryConstraint.prototype.isSatisfied = function() {
    return this.satisfied;
  };

  UnaryConstraint.prototype.markInputs = function(mark) {
    // has no inputs
  };

  /**
   * Returns the current output variable.
   */
  UnaryConstraint.prototype.output = function() {
    return this.myOutput;
  };

  /**
   * Calculate the walkabout strength, the stay flag, and, if it is
   * 'stay', the value for the current output of this constraint. Assume
   * this constraint is satisfied.
   */
  UnaryConstraint.prototype.recalculate = function() {
    this.myOutput.walkStrength = this.strength;
    this.myOutput.stay = !this.isInput();
    if (this.myOutput.stay) this.execute(); // Stay optimization
  };

  /**
   * Records that this constraint is unsatisfied
   */
  UnaryConstraint.prototype.markUnsatisfied = function() {
    this.satisfied = false;
  };

  UnaryConstraint.prototype.inputsKnown = function() {
    return true;
  };

  UnaryConstraint.prototype.removeFromGraph = function() {
    if (this.myOutput != null) this.myOutput.removeConstraint(this);
    this.satisfied = false;
  };

  /* --- *
   * S t a y   C o n s t r a i n t
   * --- */

  /**
   * Variables that should, with some level of preference, stay the same.
   * Planners may exploit the fact that instances, if satisfied, will not
   * change their output during plan execution.  This is called "stay
   * optimization".
   */
  function StayConstraint(v, str) {
    StayConstraint.superConstructor.call(this, v, str);
  }

  StayConstraint.inheritsFrom(UnaryConstraint);

  StayConstraint.prototype.execute = function() {
    // Stay constraints do nothing
  };

  /* --- *
   * E d i t   C o n s t r a i n t
   * --- */

  /**
   * A unary input constraint used to mark a variable that the client
   * wishes to change.
   */
  function EditConstraint(v, str) {
    EditConstraint.superConstructor.call(this, v, str);
  }

  EditConstraint.inheritsFrom(UnaryConstraint);

  /**
   * Edits indicate that a variable is to be changed by imperative code.
   */
  EditConstraint.prototype.isInput = function() {
    return true;
  };

  EditConstraint.prototype.execute = function() {
    // Edit constraints do nothing
  };

  /* --- *
   * B i n a r y   C o n s t r a i n t
   * --- */

  var Direction = new Object();
  Direction.NONE = 0;
  Direction.FORWARD = 1;
  Direction.BACKWARD = -1;

  /**
   * Abstract superclass for constraints having two possible output
   * variables.
   */
  function BinaryConstraint(var1, var2, strength) {
    BinaryConstraint.superConstructor.call(this, strength);
    this.v1 = var1;
    this.v2 = var2;
    this.direction = Direction.NONE;
    this.addConstraint();
  }

  BinaryConstraint.inheritsFrom(Constraint);

  /**
   * Decides if this constraint can be satisfied and which way it
   * should flow based on the relative strength of the variables related,
   * and record that decision.
   */
  BinaryConstraint.prototype.chooseMethod = function(mark) {
    if (this.v1.mark == mark) {
      this.direction =
        this.v2.mark != mark && Strength.stronger(this.strength, this.v2.walkStrength)
          ? Direction.FORWARD
          : Direction.NONE;
    }
    if (this.v2.mark == mark) {
      this.direction =
        this.v1.mark != mark && Strength.stronger(this.strength, this.v1.walkStrength)
          ? Direction.BACKWARD
          : Direction.NONE;
    }
    if (Strength.weaker(this.v1.walkStrength, this.v2.walkStrength)) {
      this.direction = Strength.stronger(this.strength, this.v1.walkStrength) ? Direction.BACKWARD : Direction.NONE;
    } else {
      this.direction = Strength.stronger(this.strength, this.v2.walkStrength) ? Direction.FORWARD : Direction.BACKWARD;
    }
  };

  /**
   * Add this constraint to the constraint graph
   */
  BinaryConstraint.prototype.addToGraph = function() {
    this.v1.addConstraint(this);
    this.v2.addConstraint(this);
    this.direction = Direction.NONE;
  };

  /**
   * Answer true if this constraint is satisfied in the current solution.
   */
  BinaryConstraint.prototype.isSatisfied = function() {
    return this.direction != Direction.NONE;
  };

  /**
   * Mark the input variable with the given mark.
   */
  BinaryConstraint.prototype.markInputs = function(mark) {
    this.input().mark = mark;
  };

  /**
   * Returns the current input variable
   */
  BinaryConstraint.prototype.input = function() {
    return this.direction == Direction.FORWARD ? this.v1 : this.v2;
  };

  /**
   * Returns the current output variable
   */
  BinaryConstraint.prototype.output = function() {
    return this.direction == Direction.FORWARD ? this.v2 : this.v1;
  };

  /**
   * Calculate the walkabout strength, the stay flag, and, if it is
   * 'stay', the value for the current output of this
   * constraint. Assume this constraint is satisfied.
   */
  BinaryConstraint.prototype.recalculate = function() {
    var ihn = this.input(),
      out = this.output();
    out.walkStrength = Strength.weakestOf(this.strength, ihn.walkStrength);
    out.stay = ihn.stay;
    if (out.stay) this.execute();
  };

  /**
   * Record the fact that this constraint is unsatisfied.
   */
  BinaryConstraint.prototype.markUnsatisfied = function() {
    this.direction = Direction.NONE;
  };

  BinaryConstraint.prototype.inputsKnown = function(mark) {
    var i = this.input();
    return i.mark == mark || i.stay || i.determinedBy == null;
  };

  BinaryConstraint.prototype.removeFromGraph = function() {
    if (this.v1 != null) this.v1.removeConstraint(this);
    if (this.v2 != null) this.v2.removeConstraint(this);
    this.direction = Direction.NONE;
  };

  /* --- *
   * S c a l e   C o n s t r a i n t
   * --- */

  /**
   * Relates two variables by the linear scaling relationship: "v2 =
   * (v1 * scale) + offset". Either v1 or v2 may be changed to maintain
   * this relationship but the scale factor and offset are considered
   * read-only.
   */
  function ScaleConstraint(src, scale, offset, dest, strength) {
    this.direction = Direction.NONE;
    this.scale = scale;
    this.offset = offset;
    ScaleConstraint.superConstructor.call(this, src, dest, strength);
  }

  ScaleConstraint.inheritsFrom(BinaryConstraint);

  /**
   * Adds this constraint to the constraint graph.
   */
  ScaleConstraint.prototype.addToGraph = function() {
    ScaleConstraint.superConstructor.prototype.addToGraph.call(this);
    this.scale.addConstraint(this);
    this.offset.addConstraint(this);
  };

  ScaleConstraint.prototype.removeFromGraph = function() {
    ScaleConstraint.superConstructor.prototype.removeFromGraph.call(this);
    if (this.scale != null) this.scale.removeConstraint(this);
    if (this.offset != null) this.offset.removeConstraint(this);
  };

  ScaleConstraint.prototype.markInputs = function(mark) {
    ScaleConstraint.superConstructor.prototype.markInputs.call(this, mark);
    this.scale.mark = this.offset.mark = mark;
  };

  /**
   * Enforce this constraint. Assume that it is satisfied.
   */
  ScaleConstraint.prototype.execute = function() {
    if (this.direction == Direction.FORWARD) {
      this.v2.value = this.v1.value * this.scale.value + this.offset.value;
    } else {
      this.v1.value = (this.v2.value - this.offset.value) / this.scale.value;
    }
  };

  /**
   * Calculate the walkabout strength, the stay flag, and, if it is
   * 'stay', the value for the current output of this constraint. Assume
   * this constraint is satisfied.
   */
  ScaleConstraint.prototype.recalculate = function() {
    var ihn = this.input(),
      out = this.output();
    out.walkStrength = Strength.weakestOf(this.strength, ihn.walkStrength);
    out.stay = ihn.stay && this.scale.stay && this.offset.stay;
    if (out.stay) this.execute();
  };

  /* --- *
   * E q u a l i t  y   C o n s t r a i n t
   * --- */

  /**
   * Constrains two variables to have the same value.
   */
  function EqualityConstraint(var1, var2, strength) {
    EqualityConstraint.superConstructor.call(this, var1, var2, strength);
  }

  EqualityConstraint.inheritsFrom(BinaryConstraint);

  /**
   * Enforce this constraint. Assume that it is satisfied.
   */
  EqualityConstraint.prototype.execute = function() {
    this.output().value = this.input().value;
  };

  /* --- *
   * V a r i a b l e
   * --- */

  /**
   * A constrained variable. In addition to its value, it maintain the
   * structure of the constraint graph, the current dataflow graph, and
   * various parameters of interest to the DeltaBlue incremental
   * constraint solver.
   **/
  function Variable(name, initialValue) {
    this.value = initialValue || 0;
    this.constraints = new OrderedCollection();
    this.determinedBy = null;
    this.mark = 0;
    this.walkStrength = Strength.WEAKEST;
    this.stay = true;
    this.name = name;
  }

  /**
   * Add the given constraint to the set of all constraints that refer
   * this variable.
   */
  Variable.prototype.addConstraint = function(c) {
    this.constraints.add(c);
  };

  /**
   * Removes all traces of c from this variable.
   */
  Variable.prototype.removeConstraint = function(c) {
    this.constraints.remove(c);
    if (this.determinedBy == c) this.determinedBy = null;
  };

  /* --- *
   * P l a n n e r
   * --- */

  /**
   * The DeltaBlue planner
   */
  function Planner() {
    this.currentMark = 0;
  }

  /**
   * Attempt to satisfy the given constraint and, if successful,
   * incrementally update the dataflow graph.  Details: If satifying
   * the constraint is successful, it may override a weaker constraint
   * on its output. The algorithm attempts to resatisfy that
   * constraint using some other method. This process is repeated
   * until either a) it reaches a variable that was not previously
   * determined by any constraint or b) it reaches a constraint that
   * is too weak to be satisfied using any of its methods. The
   * variables of constraints that have been processed are marked with
   * a unique mark value so that we know where we've been. This allows
   * the algorithm to avoid getting into an infinite loop even if the
   * constraint graph has an inadvertent cycle.
   */
  Planner.prototype.incrementalAdd = function(c) {
    var mark = this.newMark();
    var overridden = c.satisfy(mark);
    while (overridden != null) overridden = overridden.satisfy(mark);
  };

  /**
   * Entry point for retracting a constraint. Remove the given
   * constraint and incrementally update the dataflow graph.
   * Details: Retracting the given constraint may allow some currently
   * unsatisfiable downstream constraint to be satisfied. We therefore collect
   * a list of unsatisfied downstream constraints and attempt to
   * satisfy each one in turn. This list is traversed by constraint
   * strength, strongest first, as a heuristic for avoiding
   * unnecessarily adding and then overriding weak constraints.
   * Assume: c is satisfied.
   */
  Planner.prototype.incrementalRemove = function(c) {
    var out = c.output();
    c.markUnsatisfied();
    c.removeFromGraph();
    var unsatisfied = this.removePropagateFrom(out);
    var strength = Strength.REQUIRED;
    do {
      for (var i = 0; i < unsatisfied.size(); i++) {
        var u = unsatisfied.at(i);
        if (u.strength == strength) this.incrementalAdd(u);
      }
      strength = strength.nextWeaker();
    } while (strength != Strength.WEAKEST);
  };

  /**
   * Select a previously unused mark value.
   */
  Planner.prototype.newMark = function() {
    return ++this.currentMark;
  };

  /**
   * Extract a plan for resatisfaction starting from the given source
   * constraints, usually a set of input constraints. This method
   * assumes that stay optimization is desired; the plan will contain
   * only constraints whose output variables are not stay. Constraints
   * that do no computation, such as stay and edit constraints, are
   * not included in the plan.
   * Details: The outputs of a constraint are marked when it is added
   * to the plan under construction. A constraint may be appended to
   * the plan when all its input variables are known. A variable is
   * known if either a) the variable is marked (indicating that has
   * been computed by a constraint appearing earlier in the plan), b)
   * the variable is 'stay' (i.e. it is a constant at plan execution
   * time), or c) the variable is not determined by any
   * constraint. The last provision is for past states of history
   * variables, which are not stay but which are also not computed by
   * any constraint.
   * Assume: sources are all satisfied.
   */
  Planner.prototype.makePlan = function(sources) {
    var mark = this.newMark();
    var plan = new Plan();
    var todo = sources;
    while (todo.size() > 0) {
      var c = todo.removeFirst();
      if (c.output().mark != mark && c.inputsKnown(mark)) {
        plan.addConstraint(c);
        c.output().mark = mark;
        this.addConstraintsConsumingTo(c.output(), todo);
      }
    }
    return plan;
  };

  /**
   * Extract a plan for resatisfying starting from the output of the
   * given constraints, usually a set of input constraints.
   */
  Planner.prototype.extractPlanFromConstraints = function(constraints) {
    var sources = new OrderedCollection();
    for (var i = 0; i < constraints.size(); i++) {
      var c = constraints.at(i);
      if (c.isInput() && c.isSatisfied())
        // not in plan already and eligible for inclusion
        sources.add(c);
    }
    return this.makePlan(sources);
  };

  /**
   * Recompute the walkabout strengths and stay flags of all variables
   * downstream of the given constraint and recompute the actual
   * values of all variables whose stay flag is true. If a cycle is
   * detected, remove the given constraint and answer
   * false. Otherwise, answer true.
   * Details: Cycles are detected when a marked variable is
   * encountered downstream of the given constraint. The sender is
   * assumed to have marked the inputs of the given constraint with
   * the given mark. Thus, encountering a marked node downstream of
   * the output constraint means that there is a path from the
   * constraint's output to one of its inputs.
   */
  Planner.prototype.addPropagate = function(c, mark) {
    var todo = new OrderedCollection();
    todo.add(c);
    while (todo.size() > 0) {
      var d = todo.removeFirst();
      if (d.output().mark == mark) {
        this.incrementalRemove(c);
        return false;
      }
      d.recalculate();
      this.addConstraintsConsumingTo(d.output(), todo);
    }
    return true;
  };

  /**
   * Update the walkabout strengths and stay flags of all variables
   * downstream of the given constraint. Answer a collection of
   * unsatisfied constraints sorted in order of decreasing strength.
   */
  Planner.prototype.removePropagateFrom = function(out) {
    out.determinedBy = null;
    out.walkStrength = Strength.WEAKEST;
    out.stay = true;
    var unsatisfied = new OrderedCollection();
    var todo = new OrderedCollection();
    todo.add(out);
    while (todo.size() > 0) {
      var v = todo.removeFirst();
      for (var i = 0; i < v.constraints.size(); i++) {
        var c = v.constraints.at(i);
        if (!c.isSatisfied()) unsatisfied.add(c);
      }
      var determining = v.determinedBy;
      for (var i = 0; i < v.constraints.size(); i++) {
        var next = v.constraints.at(i);
        if (next != determining && next.isSatisfied()) {
          next.recalculate();
          todo.add(next.output());
        }
      }
    }
    return unsatisfied;
  };

  Planner.prototype.addConstraintsConsumingTo = function(v, coll) {
    var determining = v.determinedBy;
    var cc = v.constraints;
    for (var i = 0; i < cc.size(); i++) {
      var c = cc.at(i);
      if (c != determining && c.isSatisfied()) coll.add(c);
    }
  };

  /* --- *
   * P l a n
   * --- */

  /**
   * A Plan is an ordered list of constraints to be executed in sequence
   * to resatisfy all currently satisfiable constraints in the face of
   * one or more changing inputs.
   */
  function Plan() {
    this.v = new OrderedCollection();
  }

  Plan.prototype.addConstraint = function(c) {
    this.v.add(c);
  };

  Plan.prototype.size = function() {
    return this.v.size();
  };

  Plan.prototype.constraintAt = function(index) {
    return this.v.at(index);
  };

  Plan.prototype.execute = function() {
    for (var i = 0; i < this.size(); i++) {
      var c = this.constraintAt(i);
      c.execute();
    }
  };

  /* --- *
   * M a i n
   * --- */

  /**
   * This is the standard DeltaBlue benchmark. A long chain of equality
   * constraints is constructed with a stay constraint on one end. An
   * edit constraint is then added to the opposite end and the time is
   * measured for adding and removing this constraint, and extracting
   * and executing a constraint satisfaction plan. There are two cases.
   * In case 1, the added constraint is stronger than the stay
   * constraint and values must propagate down the entire length of the
   * chain. In case 2, the added constraint is weaker than the stay
   * constraint so it cannot be accomodated. The cost in this case is,
   * of course, very low. Typical situations lie somewhere between these
   * two extremes.
   */
  function chainTest(n) {
    planner = new Planner();
    var prev = null,
      first = null,
      last = null;

    // Build chain of n equality constraints
    for (var i = 0; i <= n; i++) {
      var name = "v" + i;
      var v = new Variable(name);
      if (prev != null) new EqualityConstraint(prev, v, Strength.REQUIRED);
      if (i == 0) first = v;
      if (i == n) last = v;
      prev = v;
    }

    new StayConstraint(last, Strength.STRONG_DEFAULT);
    var edit = new EditConstraint(first, Strength.PREFERRED);
    var edits = new OrderedCollection();
    edits.add(edit);
    var plan = planner.extractPlanFromConstraints(edits);
    for (var i = 0; i < 100; i++) {
      first.value = i;
      plan.execute();
      if (last.value != i) alert("Chain test failed.");
    }
  }

  /**
   * This test constructs a two sets of variables related to each
   * other by a simple linear transformation (scale and offset). The
   * time is measured to change a variable on either side of the
   * mapping and to change the scale and offset factors.
   */
  function projectionTest(n) {
    planner = new Planner();
    var scale = new Variable("scale", 10);
    var offset = new Variable("offset", 1000);
    var src = null,
      dst = null;

    var dests = new OrderedCollection();
    for (var i = 0; i < n; i++) {
      src = new Variable("src" + i, i);
      dst = new Variable("dst" + i, i);
      dests.add(dst);
      new StayConstraint(src, Strength.NORMAL);
      new ScaleConstraint(src, scale, offset, dst, Strength.REQUIRED);
    }

    change(src, 17);
    if (dst.value != 1170) alert("Projection 1 failed");
    change(dst, 1050);
    if (src.value != 5) alert("Projection 2 failed");
    change(scale, 5);
    for (var i = 0; i < n - 1; i++) {
      if (dests.at(i).value != i * 5 + 1000) alert("Projection 3 failed");
    }
    change(offset, 2000);
    for (var i = 0; i < n - 1; i++) {
      if (dests.at(i).value != i * 5 + 2000) alert("Projection 4 failed");
    }
  }

  function change(v, newValue) {
    var edit = new EditConstraint(v, Strength.PREFERRED);
    var edits = new OrderedCollection();
    edits.add(edit);
    var plan = planner.extractPlanFromConstraints(edits);
    for (var i = 0; i < 10; i++) {
      v.value = newValue;
      plan.execute();
    }
    edit.destroyConstraint();
  }

  // Global variable holding the current planner.
  var planner = null;

  function deltaBlue() {
    chainTest(100);
    projectionTest(100);
  }

  var success = true;

  function PrintResult(name, result) {
    print(name + ": " + result);
  }

  function PrintError(name, error) {
    PrintResult(name, error);
    success = false;
  }

  function PrintScore(score) {
    if (success) {
      print("----");
      print("Score (version " + BenchmarkSuite.version + "): " + score);
    }
  }

  BenchmarkSuite.RunSuites({ NotifyResult: PrintResult, NotifyError: PrintError, NotifyScore: PrintScore });
})();
