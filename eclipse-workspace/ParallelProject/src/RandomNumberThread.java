import java.util.*;
public class RandomNumberThread {

	static final List<Integer> randomNumbers = new ArrayList<>();
	static final Object lock = new Object();
    static boolean randomReady = false;

	// Thread 1: Generate Random Numbers
        public void run() {
            synchronized (lock) {
                Random rand = new Random();
                System.out.println("\n[T1] Generating random numbers:");
                for (int i = 0; i < 10; i++) {
                    int num = rand.nextInt(100);
                    randomNumbers.add(num);
                    System.out.print(num + " ");
                }
                System.out.println();

                // Notify others
                randomReady = true;
                lock.notifyAll();
            }
        
        
}
}
